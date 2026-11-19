package grpcserver

import (
	"context"
	"errors"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	identityv1 "github.com/live-quiz-platform/live-quiz/services/identity/api/identity/v1"
	"github.com/live-quiz-platform/live-quiz/services/identity/internal/token"
	"github.com/live-quiz-platform/live-quiz/services/identity/internal/user"
)

type mockUserRepository struct {
	createdUser         user.User
	foundUser           user.User
	rotatedUser         user.User
	err                 error
	rotationErr         error
	revokeErr           error
	called              bool
	refreshTokenCalled  bool
	rotateTokenCalled   bool
	revokeTokenCalled   bool
	createdRefreshToken user.RefreshToken
}

func newTestServer(repository *mockUserRepository) *Server {
	registrationService := user.NewRegistrationService(repository)
	authenticationService := user.NewAuthenticationService(repository)

	tokenManager, err := token.NewManager(
		"this-is-a-test-secret-with-at-least-32-characters",
		15*time.Minute,
	)
	if err != nil {
		panic(err)
	}

	refreshTokenService, err := user.NewRefreshTokenService(
		repository,
		7*24*time.Hour,
	)
	if err != nil {
		panic(err)
	}

	return NewServer(
		registrationService,
		authenticationService,
		tokenManager,
		refreshTokenService,
	)
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

func (m *mockUserRepository) FindByEmail(
	ctx context.Context,
	email string,
) (user.User, error) {
	if m.err != nil {
		return user.User{}, m.err
	}

	if m.foundUser.ID == "" {
		return user.User{}, user.ErrInvalidCredentials
	}

	return m.foundUser, nil
}

func (m *mockUserRepository) CreateRefreshToken(
	ctx context.Context,
	refreshToken user.RefreshToken,
) error {
	m.refreshTokenCalled = true
	m.createdRefreshToken = refreshToken
	return nil
}

func (m *mockUserRepository) RotateRefreshToken(
	ctx context.Context,
	currentTokenHash string,
	newTokenHash string,
	expiresAt time.Time,
) (user.User, error) {
	m.rotateTokenCalled = true
	if m.rotationErr != nil {
		return user.User{}, m.rotationErr
	}
	return m.rotatedUser, nil
}

func (m *mockUserRepository) RevokeRefreshToken(
	ctx context.Context,
	tokenHash string,
) error {
	m.revokeTokenCalled = true
	if m.revokeErr != nil {
		return m.revokeErr
	}
	return nil
}

func TestRegister_Success(t *testing.T) {
	repository := &mockUserRepository{}
	server := newTestServer(repository)

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

			server := newTestServer(repository)

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
	server := newTestServer(&mockUserRepository{})

	_, err := server.Register(context.Background(), nil)

	if status.Code(err) != codes.InvalidArgument {
		t.Errorf("expected InvalidArgument, got %v", status.Code(err))
	}
}

func TestLogin_Success(t *testing.T) {
	password := "securepass123"

	passwordHash, err := user.HashPassword(password)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	repository := &mockUserRepository{
		foundUser: user.User{
			ID:           "test-user-id",
			Email:        "student@example.com",
			PasswordHash: passwordHash,
			DisplayName:  "Student Test",
			Role:         "student",
			CreatedAt:    time.Now(),
		},
	}

	server := newTestServer(repository)

	response, err := server.Login(context.Background(), &identityv1.LoginRequest{
		Email:    "student@example.com",
		Password: password,
	})

	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if response == nil {
		t.Fatal("expected a response, got nil")
	}

	if response.AccessToken == "" {
		t.Error("expected an access token")
	}

	if response.UserId != "test-user-id" {
		t.Errorf("expected user ID test-user-id, got %s", response.UserId)
	}

	if response.Role != "student" {
		t.Errorf("expected role student, got %s", response.Role)
	}

	if response.ExpiresAt <= time.Now().Unix() {
		t.Error("expected expiration time to be in the future")
	}
	if response.RefreshToken == "" {
		t.Error("expected a refresh token")
	}
	if response.RefreshExpiresAt <= time.Now().Unix() {
		t.Error("expected refresh token expiration time to be in the future")
	}
	if !repository.refreshTokenCalled {
		t.Error("expected refresh token to be persisted")
	}
}

func TestRefreshToken_Success(t *testing.T) {
	repository := &mockUserRepository{
		rotatedUser: user.User{
			ID:   "test-user-id",
			Role: "student",
		},
	}
	server := newTestServer(repository)

	response, err := server.RefreshToken(
		context.Background(),
		&identityv1.RefreshTokenRequest{RefreshToken: "current-refresh-token"},
	)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if response.AccessToken == "" || response.RefreshToken == "" {
		t.Fatal("expected access and refresh tokens")
	}
	if response.UserId != "test-user-id" || response.Role != "student" {
		t.Errorf("unexpected refreshed identity: user=%q role=%q", response.UserId, response.Role)
	}
	if response.ExpiresAt <= time.Now().Unix() ||
		response.RefreshExpiresAt <= time.Now().Unix() {
		t.Error("expected token expirations to be in the future")
	}
	if !repository.rotateTokenCalled {
		t.Error("expected refresh token rotation")
	}
}

func TestRefreshToken_InvalidToken(t *testing.T) {
	repository := &mockUserRepository{
		rotationErr: user.ErrInvalidRefreshToken,
	}
	server := newTestServer(repository)

	_, err := server.RefreshToken(
		context.Background(),
		&identityv1.RefreshTokenRequest{RefreshToken: "invalid"},
	)
	if status.Code(err) != codes.Unauthenticated {
		t.Errorf("expected Unauthenticated, got %v", status.Code(err))
	}
}

func TestLogout_Success(t *testing.T) {
	repository := &mockUserRepository{}
	server := newTestServer(repository)

	response, err := server.Logout(
		context.Background(),
		&identityv1.LogoutRequest{RefreshToken: "refresh-token"},
	)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !response.Success {
		t.Error("expected successful logout")
	}
	if !repository.revokeTokenCalled {
		t.Error("expected refresh token family revocation")
	}
}

func TestLogin_InvalidPassword(t *testing.T) {
	passwordHash, err := user.HashPassword("correct-password")
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	repository := &mockUserRepository{
		foundUser: user.User{
			ID:           "test-user-id",
			Email:        "student@example.com",
			PasswordHash: passwordHash,
			DisplayName:  "Student Test",
			Role:         "student",
		},
	}

	server := newTestServer(repository)

	_, err = server.Login(context.Background(), &identityv1.LoginRequest{
		Email:    "student@example.com",
		Password: "wrong-password",
	})

	if status.Code(err) != codes.Unauthenticated {
		t.Errorf("expected Unauthenticated, got %v", status.Code(err))
	}

	if status.Convert(err).Message() != "invalid email or password" {
		t.Errorf("unexpected error message: %v", status.Convert(err).Message())
	}
}

func TestLogin_UnknownEmail(t *testing.T) {
	repository := &mockUserRepository{}

	server := newTestServer(repository)

	_, err := server.Login(context.Background(), &identityv1.LoginRequest{
		Email:    "unknown@example.com",
		Password: "securepass123",
	})

	if status.Code(err) != codes.Unauthenticated {
		t.Errorf("expected Unauthenticated, got %v", status.Code(err))
	}

	if status.Convert(err).Message() != "invalid email or password" {
		t.Errorf("unexpected error message: %v", status.Convert(err).Message())
	}
}

func TestLogin_NilRequest(t *testing.T) {
	server := newTestServer(&mockUserRepository{})

	_, err := server.Login(context.Background(), nil)

	if status.Code(err) != codes.InvalidArgument {
		t.Errorf("expected InvalidArgument, got %v", status.Code(err))
	}

	if status.Convert(err).Message() != "request is required" {
		t.Errorf("unexpected error message: %v", status.Convert(err).Message())
	}
}

func TestLogin_RepositoryError(t *testing.T) {
	repository := &mockUserRepository{
		err: errors.New("database connection failed"),
	}

	server := newTestServer(repository)

	_, err := server.Login(context.Background(), &identityv1.LoginRequest{
		Email:    "student@example.com",
		Password: "securepass123",
	})

	if status.Code(err) != codes.Internal {
		t.Errorf("expected Internal, got %v", status.Code(err))
	}

	if status.Convert(err).Message() != "authentication failed" {
		t.Errorf("unexpected error message: %v", status.Convert(err).Message())
	}
}
