package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/live-quiz-platform/live-quiz/services/identity/internal/user"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{
		pool: pool,
	}
}

func (r *Repository) Create(
	ctx context.Context,
	newUser user.User,
) (user.User, error) {
	const query = `
		WITH inserted_user AS (
			INSERT INTO users (
				id,
				email,
				password_hash,
				display_name,
				role_id
			)
			SELECT
				gen_random_uuid(),
				$1,
				$2,
				$3,
				r.id
			FROM roles r
			WHERE r.name = 'student'
			RETURNING
				id,
				email,
				password_hash,
				display_name,
				created_at,
				role_id
		)
		SELECT
			u.id::text,
			u.email,
			u.password_hash,
			u.display_name,
			u.created_at,
			r.name
		FROM inserted_user u
		JOIN roles r ON r.id = u.role_id
	`

	var createdUser user.User

	err := r.pool.QueryRow(
		ctx,
		query,
		newUser.Email,
		newUser.PasswordHash,
		newUser.DisplayName,
	).Scan(
		&createdUser.ID,
		&createdUser.Email,
		&createdUser.PasswordHash,
		&createdUser.DisplayName,
		&createdUser.CreatedAt,
		&createdUser.Role,
	)
	if err != nil {
		var pgErr *pgconn.PgError

		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return user.User{}, user.ErrEmailAlreadyExists
		}

		return user.User{}, fmt.Errorf("create user: %w", err)
	}

	return createdUser, nil
}

func (r *Repository) FindByEmail(
	ctx context.Context,
	email string,
) (user.User, error) {
	const query = `
		SELECT
			u.id::text,
			u.email,
			u.password_hash,
			u.display_name,
			u.created_at,
			r.name
		FROM users u
		JOIN roles r ON r.id = u.role_id
		WHERE u.email = $1
	`

	var foundUser user.User

	err := r.pool.QueryRow(
		ctx,
		query,
		email,
	).Scan(
		&foundUser.ID,
		&foundUser.Email,
		&foundUser.PasswordHash,
		&foundUser.DisplayName,
		&foundUser.CreatedAt,
		&foundUser.Role,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return user.User{}, user.ErrInvalidCredentials
		}

		return user.User{}, fmt.Errorf("find user by email: %w", err)
	}

	return foundUser, nil
}

func (r *Repository) CreateRefreshToken(
	ctx context.Context,
	token user.RefreshToken,
) error {
	const query = `
		INSERT INTO refresh_tokens (
			user_id,
			token_hash,
			family_id,
			expires_at
		)
		VALUES ($1, $2, $3, $4)
	`

	_, err := r.pool.Exec(
		ctx,
		query,
		token.UserID,
		token.TokenHash,
		token.FamilyID,
		token.ExpiresAt,
	)
	if err != nil {
		return fmt.Errorf("create refresh token: %w", err)
	}

	return nil
}

func (r *Repository) RevokeRefreshToken(
	ctx context.Context,
	tokenHash string,
) error {
	const query = `
		UPDATE refresh_tokens
		SET revoked_at = COALESCE(revoked_at, NOW())
		WHERE family_id = (
			SELECT family_id
			FROM refresh_tokens
			WHERE token_hash = $1
		)
	`

	_, err := r.pool.Exec(ctx, query, tokenHash)
	if err != nil {
		return fmt.Errorf("revoke refresh token family: %w", err)
	}

	return nil
}

func (r *Repository) RotateRefreshToken(
	ctx context.Context,
	currentTokenHash string,
	newTokenHash string,
	expiresAt time.Time,
) (user.User, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return user.User{}, fmt.Errorf("begin refresh token rotation: %w", err)
	}
	defer tx.Rollback(ctx)

	const selectQuery = `
		SELECT
			user_id::text,
			family_id::text,
			expires_at,
			used_at,
			revoked_at
		FROM refresh_tokens
		WHERE token_hash = $1
		FOR UPDATE
	`

	var (
		userID      string
		familyID    string
		tokenExpiry time.Time
		usedAt      *time.Time
		revokedAt   *time.Time
	)

	err = tx.QueryRow(ctx, selectQuery, currentTokenHash).Scan(
		&userID,
		&familyID,
		&tokenExpiry,
		&usedAt,
		&revokedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return user.User{}, user.ErrInvalidRefreshToken
		}

		return user.User{}, fmt.Errorf("find refresh token: %w", err)
	}

	// A previously used token indicates possible token reuse.
	if usedAt != nil {
		const revokeFamilyQuery = `
			UPDATE refresh_tokens
			SET revoked_at = COALESCE(revoked_at, NOW())
			WHERE family_id = $1
		`

		_, err = tx.Exec(ctx, revokeFamilyQuery, familyID)
		if err != nil {
			return user.User{}, fmt.Errorf("revoke refresh token family: %w", err)
		}

		if err := tx.Commit(ctx); err != nil {
			return user.User{}, fmt.Errorf("commit token family revocation: %w", err)
		}

		return user.User{}, user.ErrRefreshTokenReused
	}

	if revokedAt != nil || !tokenExpiry.After(time.Now()) {
		return user.User{}, user.ErrInvalidRefreshToken
	}

	const markUsedQuery = `
		UPDATE refresh_tokens
		SET used_at = NOW()
		WHERE token_hash = $1
	`

	_, err = tx.Exec(ctx, markUsedQuery, currentTokenHash)
	if err != nil {
		return user.User{}, fmt.Errorf("mark refresh token as used: %w", err)
	}

	const insertQuery = `
		INSERT INTO refresh_tokens (
			user_id,
			token_hash,
			family_id,
			expires_at
		)
		VALUES ($1, $2, $3, $4)
	`

	_, err = tx.Exec(
		ctx,
		insertQuery,
		userID,
		newTokenHash,
		familyID,
		expiresAt,
	)
	if err != nil {
		return user.User{}, fmt.Errorf("create rotated refresh token: %w", err)
	}

	const userQuery = `
		SELECT
			u.id::text,
			u.email,
			u.password_hash,
			u.display_name,
			u.created_at,
			r.name
		FROM users u
		JOIN roles r ON r.id = u.role_id
		WHERE u.id = $1
	`

	var refreshedUser user.User

	err = tx.QueryRow(ctx, userQuery, userID).Scan(
		&refreshedUser.ID,
		&refreshedUser.Email,
		&refreshedUser.PasswordHash,
		&refreshedUser.DisplayName,
		&refreshedUser.CreatedAt,
		&refreshedUser.Role,
	)
	if err != nil {
		return user.User{}, fmt.Errorf("find user for refresh token: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return user.User{}, fmt.Errorf("commit refresh token rotation: %w", err)
	}

	return refreshedUser, nil
}
