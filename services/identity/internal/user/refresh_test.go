package user

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/live-quiz-platform/live-quiz/services/identity/internal/token"
)

func TestRefreshTokenService_Issue(t *testing.T) {
	repository := &FakeRepository{}
	service, err := NewRefreshTokenService(repository, 7*24*time.Hour)
	if err != nil {
		t.Fatalf("create refresh token service: %v", err)
	}

	issued, err := service.Issue(context.Background(), "user-id")
	if err != nil {
		t.Fatalf("issue refresh token: %v", err)
	}

	if issued.Token == "" {
		t.Fatal("expected a refresh token")
	}
	if issued.ExpiresAt.Before(time.Now()) {
		t.Error("expected expiration time to be in the future")
	}
	if repository.createdRefreshToken.TokenHash != token.HashRefreshToken(issued.Token) {
		t.Error("expected repository to store only the refresh token hash")
	}
	if repository.createdRefreshToken.UserID != "user-id" {
		t.Errorf("expected user ID user-id, got %q", repository.createdRefreshToken.UserID)
	}
	if repository.createdRefreshToken.FamilyID == "" {
		t.Error("expected a refresh token family ID")
	}
}

func TestRefreshTokenService_Rotate(t *testing.T) {
	repository := &FakeRepository{
		rotatedUser: User{
			ID:   "user-id",
			Role: "student",
		},
	}
	service, err := NewRefreshTokenService(repository, 7*24*time.Hour)
	if err != nil {
		t.Fatalf("create refresh token service: %v", err)
	}

	rotated, err := service.Rotate(context.Background(), "old-token")
	if err != nil {
		t.Fatalf("rotate refresh token: %v", err)
	}

	if rotated.Token == "" || rotated.Token == "old-token" {
		t.Error("expected a new refresh token")
	}
	if rotated.User.ID != "user-id" {
		t.Errorf("expected user ID user-id, got %q", rotated.User.ID)
	}
	if repository.rotatedTokenHash != token.HashRefreshToken("old-token") {
		t.Error("expected the current token hash to be used for rotation")
	}
	if repository.newTokenHash != token.HashRefreshToken(rotated.Token) {
		t.Error("expected the new token hash to be persisted")
	}
	if repository.newTokenExpiresAt.Before(time.Now()) {
		t.Error("expected the new token expiration to be in the future")
	}
}

func TestRefreshTokenService_RotateEmptyToken(t *testing.T) {
	service, err := NewRefreshTokenService(&FakeRepository{}, time.Hour)
	if err != nil {
		t.Fatalf("create refresh token service: %v", err)
	}

	_, err = service.Rotate(context.Background(), "  ")
	if !errors.Is(err, ErrInvalidRefreshToken) {
		t.Errorf("expected ErrInvalidRefreshToken, got %v", err)
	}
}

func TestRefreshTokenService_Revoke(t *testing.T) {
	repository := &FakeRepository{}
	service, err := NewRefreshTokenService(repository, time.Hour)
	if err != nil {
		t.Fatalf("create refresh token service: %v", err)
	}

	err = service.Revoke(context.Background(), "refresh-token")
	if err != nil {
		t.Fatalf("revoke refresh token: %v", err)
	}
	if !repository.revokeTokenCalled {
		t.Fatal("expected repository revocation")
	}
	if repository.revokedTokenHash != token.HashRefreshToken("refresh-token") {
		t.Error("expected only the token hash to be used for revocation")
	}
}

func TestNewRefreshTokenService_RequiresPositiveExpiration(t *testing.T) {
	_, err := NewRefreshTokenService(&FakeRepository{}, 0)
	if err == nil {
		t.Fatal("expected an error for non-positive expiration")
	}
}
