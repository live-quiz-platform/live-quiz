package user

import (
	"context"
	"errors"
	"testing"
)

func TestRegistrationServiceRegister(t *testing.T) {
	repository := &FakeRepository{}
	service := NewRegistrationService(repository)

	result, err := service.Register(
		context.Background(),
		" Student@Example.com ",
		"password123",
		" Student ",
	)
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}

	if !repository.called {
		t.Fatal("expected repository to be called")
	}

	if repository.createdUser.Email != "student@example.com" {
		t.Errorf(
			"expected normalized email, got %q",
			repository.createdUser.Email,
		)
	}

	if repository.createdUser.DisplayName != "Student" {
		t.Errorf(
			"expected trimmed display name, got %q",
			repository.createdUser.DisplayName,
		)
	}

	if repository.createdUser.PasswordHash == "password123" {
		t.Fatal("password must not be stored in plaintext")
	}

	match, err := VerifyPassword(
		"password123",
		repository.createdUser.PasswordHash,
	)
	if err != nil {
		t.Fatalf("VerifyPassword() error = %v", err)
	}

	if !match {
		t.Fatal("expected stored hash to match original password")
	}

	if result.ID != "test-user-id" {
		t.Errorf("expected user ID test-user-id, got %q", result.ID)
	}

	if result.Email != "student@example.com" {
		t.Errorf("unexpected result email: %q", result.Email)
	}

	if result.DisplayName != "Student" {
		t.Errorf("unexpected display name: %q", result.DisplayName)
	}
}

func TestRegistrationServiceRegisterInvalidInput(t *testing.T) {
	tests := []struct {
		name        string
		email       string
		password    string
		displayName string
		expectedErr error
	}{
		{
			name:        "invalid email",
			email:       "invalid-email",
			password:    "password123",
			displayName: "Student",
			expectedErr: ErrInvalidEmail,
		},
		{
			name:        "password too short",
			email:       "student@example.com",
			password:    "short",
			displayName: "Student",
			expectedErr: ErrPasswordTooShort,
		},
		{
			name:        "empty display name",
			email:       "student@example.com",
			password:    "password123",
			displayName: "   ",
			expectedErr: ErrInvalidDisplayName,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &FakeRepository{}
			service := NewRegistrationService(repository)

			_, err := service.Register(
				context.Background(),
				tt.email,
				tt.password,
				tt.displayName,
			)

			if !errors.Is(err, tt.expectedErr) {
				t.Errorf(
					"expected error %v, got %v",
					tt.expectedErr,
					err,
				)
			}

			if repository.called {
				t.Fatal("repository should not be called for invalid input")
			}
		})
	}
}

func TestRegistrationServiceRegisterDuplicateEmail(t *testing.T) {
	repository := &FakeRepository{
		createErr: ErrEmailAlreadyExists,
	}
	service := NewRegistrationService(repository)

	_, err := service.Register(
		context.Background(),
		"student@example.com",
		"password123",
		"Student",
	)

	if !errors.Is(err, ErrEmailAlreadyExists) {
		t.Errorf("expected ErrEmailAlreadyExists, got %v", err)
	}
}

func TestRegistrationServiceRegisterRepositoryError(t *testing.T) {
	expectedErr := errors.New("database unavailable")

	repository := &FakeRepository{
		createErr: expectedErr,
	}
	service := NewRegistrationService(repository)

	_, err := service.Register(
		context.Background(),
		"student@example.com",
		"password123",
		"Student",
	)

	if !errors.Is(err, expectedErr) {
		t.Errorf("expected repository error %v, got %v", expectedErr, err)
	}
}
