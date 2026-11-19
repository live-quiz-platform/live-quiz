package user

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestAuthenticationServiceAuthenticate(t *testing.T) {
	password := "password123"

	passwordHash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	repository := &FakeRepository{
		foundUser: User{
			ID:           "test-user-id",
			Email:        "student@example.com",
			PasswordHash: passwordHash,
			DisplayName:  "Student",
			CreatedAt:    time.Now(),
		},
	}

	service := NewAuthenticationService(repository)

	result, err := service.Authenticate(
		context.Background(),
		" Student@Example.com ",
		password,
	)
	if err != nil {
		t.Fatalf("Authenticate() error = %v", err)
	}

	if !repository.findCalled {
		t.Fatal("expected repository to be called")
	}

	if repository.foundEmail != "student@example.com" {
		t.Errorf("expected normalized email, got %q", repository.foundEmail)
	}

	if result.ID != "test-user-id" {
		t.Errorf("expected user ID test-user-id, got %q", result.ID)
	}

	if result.Email != "student@example.com" {
		t.Errorf("expected email student@example.com, got %q", result.Email)
	}

	if result.DisplayName != "Student" {
		t.Errorf("expected display name Student, got %q", result.DisplayName)
	}
}

func TestAuthenticationServiceAuthenticateInvalidPassword(t *testing.T) {
	passwordHash, err := HashPassword("correct-password")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	repository := &FakeRepository{
		foundUser: User{
			ID:           "test-user-id",
			Email:        "student@example.com",
			PasswordHash: passwordHash,
			DisplayName:  "Student",
		},
	}

	service := NewAuthenticationService(repository)

	_, err = service.Authenticate(
		context.Background(),
		"student@example.com",
		"wrong-password",
	)

	if !errors.Is(err, ErrInvalidCredentials) {
		t.Errorf("expected ErrInvalidCredentials, got %v", err)
	}
}

func TestAuthenticationServiceAuthenticateUnknownEmail(t *testing.T) {
	repository := &FakeRepository{
		findErr: ErrInvalidCredentials,
	}

	service := NewAuthenticationService(repository)

	_, err := service.Authenticate(
		context.Background(),
		"unknown@example.com",
		"password123",
	)

	if !errors.Is(err, ErrInvalidCredentials) {
		t.Errorf("expected ErrInvalidCredentials, got %v", err)
	}

	if !repository.findCalled {
		t.Fatal("expected repository to be called")
	}
}

func TestAuthenticationServiceAuthenticateRepositoryError(t *testing.T) {
	repository := &FakeRepository{
		findErr: errors.New("database connection failed"),
	}

	service := NewAuthenticationService(repository)

	_, err := service.Authenticate(
		context.Background(),
		"student@example.com",
		"password123",
	)

	if err == nil {
		t.Fatal("expected an error, got nil")
	}

	if errors.Is(err, ErrInvalidCredentials) {
		t.Error("expected a repository error, not ErrInvalidCredentials")
	}
}

func TestAuthenticationServiceAuthenticateInvalidHash(t *testing.T) {
	repository := &FakeRepository{
		foundUser: User{
			ID:           "test-user-id",
			Email:        "student@example.com",
			PasswordHash: "invalid-hash",
			DisplayName:  "Student",
		},
	}

	service := NewAuthenticationService(repository)

	_, err := service.Authenticate(
		context.Background(),
		"student@example.com",
		"password123",
	)

	if err == nil {
		t.Fatal("expected an error for invalid password hash, got nil")
	}

	if errors.Is(err, ErrInvalidCredentials) {
		t.Error("expected a password hash error, not ErrInvalidCredentials")
	}
}
