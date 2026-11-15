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

	if createdUser.CreatedAt.IsZero() {
		t.Error("expected generated creation timestamp")
	}

	_, err = repo.Create(ctx, newUser)
	if !errors.Is(err, user.ErrEmailAlreadyExists) {
		t.Errorf(
			"expected ErrEmailAlreadyExists, got %v",
			err,
		)
	}
}
