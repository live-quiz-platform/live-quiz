package grpcserver

import (
	"context"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	identityv1 "github.com/live-quiz-platform/live-quiz/services/identity/api/identity/v1"
	"github.com/live-quiz-platform/live-quiz/services/identity/internal/user"
)

type mockUserRepository struct {
	createdUser user.User
	err         error
	called      bool
}

func (m *mockUserRepository) Create(
	ctx context.Context,
	newUser user.User,
) (user.User, error) {
	m.called = true
	m.createdUser = newUser

	if m.err != nil {
		return user.User{}, m.err
	}

	newUser.ID = "test-user-id"
	newUser.CreatedAt = time.Now()

	return newUser, nil
}

func TestRegister_Success(t *testing.T) {
	repository := &mockUserRepository{}
	registrationService := user.NewRegistrationService(repository)
	server := NewServer(registrationService)

	response, err := server.Register(context.Background(), &identityv1.RegisterRequest{
		Email:       "student@example.com",
		Password:    "securepass123",
		DisplayName: "Student Test",
	})

	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if response == nil {
		t.Fatal("expected a response, got nil")
	}

	if response.UserId != "test-user-id" {
		t.Errorf("expected user ID test-user-id, got %s", response.UserId)
	}

	if response.Email != "student@example.com" {
		t.Errorf("unexpected email: %s", response.Email)
	}

	if response.DisplayName != "Student Test" {
		t.Errorf("unexpected display name: %s", response.DisplayName)
	}

	if !repository.called {
		t.Error("expected repository Create to be called")
	}

	if repository.createdUser.PasswordHash == "" {
		t.Error("expected password to be hashed")
	}

	if repository.createdUser.PasswordHash == "securepass123" {
		t.Error("password must not be stored in plain text")
	}
}

func TestRegister_Errors(t *testing.T) {
	tests := []struct {
		name            string
		request         *identityv1.RegisterRequest
		repositoryErr   error
		expectedCode    codes.Code
		expectedMessage string
	}{
		{
			name: "invalid email",
			request: &identityv1.RegisterRequest{
				Email:       "invalid-email",
				Password:    "securepass123",
				DisplayName: "Student",
			},
			expectedCode:    codes.InvalidArgument,
			expectedMessage: "email: invalid format",
		},
		{
			name: "password too short",
			request: &identityv1.RegisterRequest{
				Email:       "student@example.com",
				Password:    "short",
				DisplayName: "Student",
			},
			expectedCode:    codes.InvalidArgument,
			expectedMessage: "password: must contain at least 8 characters",
		},
		{
			name: "display name required",
			request: &identityv1.RegisterRequest{
				Email:       "student@example.com",
				Password:    "securepass123",
				DisplayName: "   ",
			},
			expectedCode:    codes.InvalidArgument,
			expectedMessage: "display_name: is required",
		},
		{
			name: "email already exists",
			request: &identityv1.RegisterRequest{
				Email:       "student@example.com",
				Password:    "securepass123",
				DisplayName: "Student",
			},
			repositoryErr:   user.ErrEmailAlreadyExists,
			expectedCode:    codes.AlreadyExists,
			expectedMessage: "email: already exists",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &mockUserRepository{
				err: tt.repositoryErr,
			}

			registrationService := user.NewRegistrationService(repository)
			server := NewServer(registrationService)

			_, err := server.Register(context.Background(), tt.request)

			if err == nil {
				t.Fatal("expected an error, got nil")
			}

			if status.Code(err) != tt.expectedCode {
				t.Errorf("expected code %v, got %v",
					tt.expectedCode, status.Code(err))
			}

			if status.Convert(err).Message() != tt.expectedMessage {
				t.Errorf("expected message %q, got %q",
					tt.expectedMessage, status.Convert(err).Message())
			}
		})
	}
}

func TestRegister_NilRequest(t *testing.T) {
	server := NewServer(user.NewRegistrationService(&mockUserRepository{}))

	_, err := server.Register(context.Background(), nil)

	if status.Code(err) != codes.InvalidArgument {
		t.Errorf("expected InvalidArgument, got %v", status.Code(err))
	}
}
