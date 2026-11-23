package postgres

import (
	"context"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/live-quiz-platform/live-quiz/services/identity/internal/config"
	"github.com/live-quiz-platform/live-quiz/services/identity/internal/database"
	"github.com/live-quiz-platform/live-quiz/services/identity/internal/user"
)

func TestRepository_Create(t *testing.T) {
	if os.Getenv("POSTGRES_HOST") == "" {
		t.Skip("PostgreSQL environment variables are not configured")
	}

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("load configuration: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := database.NewPostgresPool(ctx, cfg.Postgres)
	if err != nil {
		t.Fatalf("connect to PostgreSQL: %v", err)
	}
	t.Cleanup(pool.Close)

	repo := NewRepository(pool)

	newUser := user.User{
		Email:        fmt.Sprintf("repository-test-%d@example.com", time.Now().UnixNano()),
		PasswordHash: "test-password-hash",
		DisplayName:  "Repository Test",
	}

	createdUser, err := repo.Create(ctx, newUser)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(
			context.Background(),
			5*time.Second,
		)
		defer cleanupCancel()

		_, err := pool.Exec(
			cleanupCtx,
			"DELETE FROM users WHERE id = $1",
			createdUser.ID,
		)
		if err != nil {
			t.Errorf("clean up test user: %v", err)
		}
	})

	if createdUser.ID == "" {
		t.Error("expected generated user ID")
	}

	if createdUser.Email != newUser.Email {
		t.Errorf("expected email %q, got %q", newUser.Email, createdUser.Email)
	}

	if createdUser.PasswordHash != newUser.PasswordHash {
		t.Error("password hash does not match")
	}

	if createdUser.DisplayName != newUser.DisplayName {
		t.Errorf(
			"expected display name %q, got %q",
			newUser.DisplayName,
			createdUser.DisplayName,
		)
	}

	if createdUser.Role != "student" {
		t.Errorf("expected role student, got %q", createdUser.Role)
	}

	if createdUser.CreatedAt.IsZero() {
		t.Error("expected generated creation timestamp")
	}

	foundUser, err := repo.FindByEmail(ctx, newUser.Email)
	if err != nil {
		t.Fatalf("find created user by email: %v", err)
	}

	if foundUser.Role != "student" {
		t.Errorf("expected role student when finding user, got %q", foundUser.Role)
	}

	_, err = repo.Create(ctx, newUser)
	if !errors.Is(err, user.ErrEmailAlreadyExists) {
		t.Errorf(
			"expected ErrEmailAlreadyExists, got %v",
			err,
		)
	}
}

func TestRepository_CreateRefreshToken(t *testing.T) {
	if os.Getenv("POSTGRES_HOST") == "" {
		t.Skip("PostgreSQL environment variables are not configured")
	}

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("load configuration: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := database.NewPostgresPool(ctx, cfg.Postgres)
	if err != nil {
		t.Fatalf("connect to PostgreSQL: %v", err)
	}
	t.Cleanup(pool.Close)

	repo := NewRepository(pool)

	newUser := user.User{
		Email:        fmt.Sprintf("refresh-token-test-%d@example.com", time.Now().UnixNano()),
		PasswordHash: "test-password-hash",
		DisplayName:  "Refresh Token Test",
	}

	createdUser, err := repo.Create(ctx, newUser)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(
			context.Background(),
			5*time.Second,
		)
		defer cleanupCancel()

		_, err := pool.Exec(
			cleanupCtx,
			"DELETE FROM users WHERE id = $1",
			createdUser.ID,
		)
		if err != nil {
			t.Errorf("clean up test user: %v", err)
		}
	})

	refreshToken := user.RefreshToken{
		UserID:    createdUser.ID,
		TokenHash: "test-refresh-token-hash",
		FamilyID:  "00000000-0000-0000-0000-000000000001",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	err = repo.CreateRefreshToken(ctx, refreshToken)
	if err != nil {
		t.Fatalf("create refresh token: %v", err)
	}

	var storedHash string

	err = pool.QueryRow(
		ctx,
		"SELECT token_hash FROM refresh_tokens WHERE user_id = $1",
		createdUser.ID,
	).Scan(&storedHash)
	if err != nil {
		t.Fatalf("find stored refresh token: %v", err)
	}

	if storedHash != refreshToken.TokenHash {
		t.Errorf(
			"expected token hash %q, got %q",
			refreshToken.TokenHash,
			storedHash,
		)
	}
}

func TestRepository_RotateRefreshToken(t *testing.T) {
	if os.Getenv("POSTGRES_HOST") == "" {
		t.Skip("PostgreSQL environment variables are not configured")
	}

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("load configuration: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := database.NewPostgresPool(ctx, cfg.Postgres)
	if err != nil {
		t.Fatalf("connect to PostgreSQL: %v", err)
	}
	t.Cleanup(pool.Close)

	repo := NewRepository(pool)

	newUser := user.User{
		Email:        fmt.Sprintf("rotation-test-%d@example.com", time.Now().UnixNano()),
		PasswordHash: "test-password-hash",
		DisplayName:  "Rotation Test",
	}

	createdUser, err := repo.Create(ctx, newUser)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(
			context.Background(),
			5*time.Second,
		)
		defer cleanupCancel()

		_, err := pool.Exec(
			cleanupCtx,
			"DELETE FROM users WHERE id = $1",
			createdUser.ID,
		)
		if err != nil {
			t.Errorf("clean up test user: %v", err)
		}
	})

	const (
		familyID         = "00000000-0000-0000-0000-000000000002"
		currentTokenHash = "test-current-refresh-token-hash"
		newTokenHash     = "test-new-refresh-token-hash"
	)

	err = repo.CreateRefreshToken(ctx, user.RefreshToken{
		UserID:    createdUser.ID,
		TokenHash: currentTokenHash,
		FamilyID:  familyID,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	})
	if err != nil {
		t.Fatalf("create initial refresh token: %v", err)
	}

	newExpiry := time.Now().Add(24 * time.Hour)

	refreshedUser, err := repo.RotateRefreshToken(
		ctx,
		currentTokenHash,
		newTokenHash,
		newExpiry,
	)
	if err != nil {
		t.Fatalf("rotate refresh token: %v", err)
	}

	if refreshedUser.ID != createdUser.ID {
		t.Errorf(
			"expected user ID %q, got %q",
			createdUser.ID,
			refreshedUser.ID,
		)
	}

	if refreshedUser.Email != createdUser.Email {
		t.Errorf(
			"expected email %q, got %q",
			createdUser.Email,
			refreshedUser.Email,
		)
	}

	var oldTokenUsed bool

	err = pool.QueryRow(
		ctx,
		"SELECT used_at IS NOT NULL FROM refresh_tokens WHERE token_hash = $1",
		currentTokenHash,
	).Scan(&oldTokenUsed)
	if err != nil {
		t.Fatalf("check old refresh token: %v", err)
	}

	if !oldTokenUsed {
		t.Error("expected old refresh token to be marked as used")
	}

	var (
		storedUserID   string
		storedFamilyID string
	)

	err = pool.QueryRow(
		ctx,
		`
			SELECT user_id::text, family_id::text
			FROM refresh_tokens
			WHERE token_hash = $1
		`,
		newTokenHash,
	).Scan(&storedUserID, &storedFamilyID)
	if err != nil {
		t.Fatalf("find new refresh token: %v", err)
	}

	if storedUserID != createdUser.ID {
		t.Errorf(
			"expected new token user ID %q, got %q",
			createdUser.ID,
			storedUserID,
		)
	}

	if storedFamilyID != familyID {
		t.Errorf(
			"expected family ID %q, got %q",
			familyID,
			storedFamilyID,
		)
	}
}

func TestRepository_RotateRefreshToken_ReusedToken(t *testing.T) {
	if os.Getenv("POSTGRES_HOST") == "" {
		t.Skip("PostgreSQL environment variables are not configured")
	}

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("load configuration: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := database.NewPostgresPool(ctx, cfg.Postgres)
	if err != nil {
		t.Fatalf("connect to PostgreSQL: %v", err)
	}
	t.Cleanup(pool.Close)

	repo := NewRepository(pool)

	createdUser, err := repo.Create(ctx, user.User{
		Email:        fmt.Sprintf("reuse-test-%d@example.com", time.Now().UnixNano()),
		PasswordHash: "test-password-hash",
		DisplayName:  "Reuse Test",
	})
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(
			context.Background(),
			5*time.Second,
		)
		defer cleanupCancel()

		_, err := pool.Exec(
			cleanupCtx,
			"DELETE FROM users WHERE id = $1",
			createdUser.ID,
		)
		if err != nil {
			t.Errorf("clean up test user: %v", err)
		}
	})

	const (
		familyID         = "00000000-0000-0000-0000-000000000003"
		currentTokenHash = "test-reused-refresh-token-hash"
		newTokenHash     = "test-rotated-refresh-token-hash"
	)

	err = repo.CreateRefreshToken(ctx, user.RefreshToken{
		UserID:    createdUser.ID,
		TokenHash: currentTokenHash,
		FamilyID:  familyID,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	})
	if err != nil {
		t.Fatalf("create initial refresh token: %v", err)
	}

	_, err = repo.RotateRefreshToken(
		ctx,
		currentTokenHash,
		newTokenHash,
		time.Now().Add(24*time.Hour),
	)
	if err != nil {
		t.Fatalf("initial token rotation: %v", err)
	}

	_, err = repo.RotateRefreshToken(
		ctx,
		currentTokenHash,
		"unused-refresh-token-hash",
		time.Now().Add(24*time.Hour),
	)
	if !errors.Is(err, user.ErrRefreshTokenReused) {
		t.Fatalf(
			"expected ErrRefreshTokenReused, got %v",
			err,
		)
	}

	var revokedTokens int

	err = pool.QueryRow(
		ctx,
		`
			SELECT COUNT(*)
			FROM refresh_tokens
			WHERE family_id = $1
			  AND revoked_at IS NOT NULL
		`,
		familyID,
	).Scan(&revokedTokens)
	if err != nil {
		t.Fatalf("count revoked tokens: %v", err)
	}

	if revokedTokens != 2 {
		t.Errorf("expected 2 revoked tokens, got %d", revokedTokens)
	}
}

func TestRepository_RotateRefreshToken_InvalidToken(t *testing.T) {
	if os.Getenv("POSTGRES_HOST") == "" {
		t.Skip("PostgreSQL environment variables are not configured")
	}

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("load configuration: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := database.NewPostgresPool(ctx, cfg.Postgres)
	if err != nil {
		t.Fatalf("connect to PostgreSQL: %v", err)
	}
	t.Cleanup(pool.Close)

	repo := NewRepository(pool)

	createdUser, err := repo.Create(ctx, user.User{
		Email:        fmt.Sprintf("invalid-token-test-%d@example.com", time.Now().UnixNano()),
		PasswordHash: "test-password-hash",
		DisplayName:  "Invalid Token Test",
	})
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(
			context.Background(),
			5*time.Second,
		)
		defer cleanupCancel()

		_, err := pool.Exec(
			cleanupCtx,
			"DELETE FROM users WHERE id = $1",
			createdUser.ID,
		)
		if err != nil {
			t.Errorf("clean up test user: %v", err)
		}
	})

	tests := []struct {
		name      string
		tokenHash string
		familyID  string
		expiresAt time.Time
		revoked   bool
	}{
		{
			name:      "expired token",
			tokenHash: "test-expired-token-hash",
			familyID:  "00000000-0000-0000-0000-000000000004",
			expiresAt: time.Now().Add(-time.Hour),
		},
		{
			name:      "revoked token",
			tokenHash: "test-revoked-token-hash",
			familyID:  "00000000-0000-0000-0000-000000000005",
			expiresAt: time.Now().Add(24 * time.Hour),
			revoked:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := pool.Exec(
				ctx,
				`
					INSERT INTO refresh_tokens (
						user_id,
						token_hash,
						family_id,
						expires_at,
						revoked_at
					)
					VALUES ($1, $2, $3, $4,
						CASE WHEN $5 THEN NOW() ELSE NULL END
					)
				`,
				createdUser.ID,
				tt.tokenHash,
				tt.familyID,
				tt.expiresAt,
				tt.revoked,
			)
			if err != nil {
				t.Fatalf("insert refresh token: %v", err)
			}

			_, err = repo.RotateRefreshToken(
				ctx,
				tt.tokenHash,
				"unused-new-token-hash-"+tt.tokenHash,
				time.Now().Add(24*time.Hour),
			)

			if !errors.Is(err, user.ErrInvalidRefreshToken) {
				t.Errorf(
					"expected ErrInvalidRefreshToken, got %v",
					err,
				)
			}
		})
	}
}

func TestRepository_RevokeRefreshToken(t *testing.T) {
	if os.Getenv("POSTGRES_HOST") == "" {
		t.Skip("PostgreSQL environment variables are not configured")
	}

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("load configuration: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := database.NewPostgresPool(ctx, cfg.Postgres)
	if err != nil {
		t.Fatalf("connect to PostgreSQL: %v", err)
	}
	t.Cleanup(pool.Close)

	repo := NewRepository(pool)
	createdUser, err := repo.Create(ctx, user.User{
		Email:        fmt.Sprintf("revoke-test-%d@example.com", time.Now().UnixNano()),
		PasswordHash: "test-password-hash",
		DisplayName:  "Revoke Test",
	})
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(
			context.Background(),
			5*time.Second,
		)
		defer cleanupCancel()

		_, err := pool.Exec(cleanupCtx, "DELETE FROM users WHERE id = $1", createdUser.ID)
		if err != nil {
			t.Errorf("clean up test user: %v", err)
		}
	})

	const (
		familyID = "00000000-0000-0000-0000-000000000006"
		token1   = "revoke-family-token-1"
		token2   = "revoke-family-token-2"
	)
	for _, hash := range []string{token1, token2} {
		err = repo.CreateRefreshToken(ctx, user.RefreshToken{
			UserID:    createdUser.ID,
			TokenHash: hash,
			FamilyID:  familyID,
			ExpiresAt: time.Now().Add(24 * time.Hour),
		})
		if err != nil {
			t.Fatalf("create refresh token: %v", err)
		}
	}

	if err := repo.RevokeRefreshToken(ctx, token1); err != nil {
		t.Fatalf("revoke refresh token: %v", err)
	}

	var revokedCount int
	err = pool.QueryRow(
		ctx,
		`
			SELECT COUNT(*)
			FROM refresh_tokens
			WHERE family_id = $1
			  AND revoked_at IS NOT NULL
		`,
		familyID,
	).Scan(&revokedCount)
	if err != nil {
		t.Fatalf("count revoked refresh tokens: %v", err)
	}
	if revokedCount != 2 {
		t.Errorf("expected 2 revoked tokens, got %d", revokedCount)
	}
}

func TestRepository_RotateRefreshToken_InactiveUser(t *testing.T) {
	if os.Getenv("POSTGRES_HOST") == "" {
		t.Skip("PostgreSQL environment variables are not configured")
	}

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("load configuration: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := database.NewPostgresPool(ctx, cfg.Postgres)
	if err != nil {
		t.Fatalf("connect to PostgreSQL: %v", err)
	}
	t.Cleanup(pool.Close)

	repo := NewRepository(pool)

	createdUser, err := repo.Create(ctx, user.User{
		Email:        fmt.Sprintf("inactive-refresh-test-%d@example.com", time.Now().UnixNano()),
		PasswordHash: "test-password-hash",
		DisplayName:  "Inactive Refresh Test",
	})
	if err != nil {
		t.Fatalf("create user: %v", err)
	}

	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(
			context.Background(),
			5*time.Second,
		)
		defer cleanupCancel()

		_, err := pool.Exec(
			cleanupCtx,
			"DELETE FROM users WHERE id = $1",
			createdUser.ID,
		)
		if err != nil {
			t.Errorf("clean up test user: %v", err)
		}
	})

	const (
		familyID         = "00000000-0000-0000-0000-000000000007"
		currentTokenHash = "test-inactive-user-refresh-token-hash"
		newTokenHash     = "test-inactive-user-new-refresh-token-hash"
	)

	err = repo.CreateRefreshToken(ctx, user.RefreshToken{
		UserID:    createdUser.ID,
		TokenHash: currentTokenHash,
		FamilyID:  familyID,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	})
	if err != nil {
		t.Fatalf("create refresh token: %v", err)
	}

	_, err = pool.Exec(
		ctx,
		"UPDATE users SET is_active = FALSE WHERE id = $1",
		createdUser.ID,
	)
	if err != nil {
		t.Fatalf("deactivate user: %v", err)
	}

	_, err = repo.RotateRefreshToken(
		ctx,
		currentTokenHash,
		newTokenHash,
		time.Now().Add(24*time.Hour),
	)

	if !errors.Is(err, user.ErrInvalidRefreshToken) {
		t.Fatalf(
			"expected ErrInvalidRefreshToken, got %v",
			err,
		)
	}

	var oldTokenUsed bool

	err = pool.QueryRow(
		ctx,
		"SELECT used_at IS NOT NULL FROM refresh_tokens WHERE token_hash = $1",
		currentTokenHash,
	).Scan(&oldTokenUsed)
	if err != nil {
		t.Fatalf("check old refresh token: %v", err)
	}

	if oldTokenUsed {
		t.Error("expected old refresh token to remain unused")
	}

	var newTokenExists bool

	err = pool.QueryRow(
		ctx,
		"SELECT EXISTS(SELECT 1 FROM refresh_tokens WHERE token_hash = $1)",
		newTokenHash,
	).Scan(&newTokenExists)
	if err != nil {
		t.Fatalf("check new refresh token: %v", err)
	}

	if newTokenExists {
		t.Error("expected no new refresh token to be created")
	}
}