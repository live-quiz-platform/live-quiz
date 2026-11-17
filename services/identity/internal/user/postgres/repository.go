package postgres

import (
	"context"
	"errors"
	"fmt"

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
		INSERT INTO users (
			id,
			email,
			password_hash,
			display_name
		)
		VALUES (
			gen_random_uuid(),
			$1,
			$2,
			$3
		)
		RETURNING
			id::text,
			email,
			password_hash,
			display_name,
			created_at
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
			id::text,
			email,
			password_hash,
			display_name,
			created_at,
		FROM users
		WHERE email = $1
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
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return user.User{}, user.ErrInvalidCredentials
		}

		return user.User{}, fmt.Errorf("find user by email: %w", err)
	}

	return foundUser, nil
}