package user

import (
	"context"
	"strings"
	"time"
)

type AuthenticationResult struct {
	ID          string
	Email       string
	DisplayName string
	Role        string
	CreatedAt   time.Time
}

type AuthenticationService struct {
	repository Repository
}

func NewAuthenticationService(repository Repository) *AuthenticationService {
	return &AuthenticationService{
		repository: repository,
	}
}

func (s *AuthenticationService) Authenticate(
	ctx context.Context,
	email string,
	password string,
) (AuthenticationResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	authenticatedUser, err := s.repository.FindByEmail(ctx, email)
	if err != nil {
		return AuthenticationResult{}, err
	}

	passwordMatches, err := VerifyPassword(password, authenticatedUser.PasswordHash)
	if err != nil {
		return AuthenticationResult{}, err
	}

	if !passwordMatches {
		return AuthenticationResult{}, ErrInvalidCredentials
	}

	return AuthenticationResult{
		ID:          authenticatedUser.ID,
		Email:       authenticatedUser.Email,
		DisplayName: authenticatedUser.DisplayName,
		Role:        authenticatedUser.Role,
		CreatedAt:   authenticatedUser.CreatedAt,
	}, nil
}
