package user

import (
	"context"
	"strings"
	"time"
)

type RegistrationResult struct {
	ID          string
	Email       string
	DisplayName string
	CreatedAt   time.Time
}

type RegistrationService struct {
	repository Repository
}

func NewRegistrationService(repository Repository) *RegistrationService {
	return &RegistrationService{
		repository: repository,
	}
}

func (s *RegistrationService) Register(
	ctx context.Context,
	email string,
	password string,
	displayName string,
) (RegistrationResult, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	displayName = strings.TrimSpace(displayName)

	if err := ValidateRegistration(email, password, displayName); err != nil {
		return RegistrationResult{}, err
	}

	passwordHash, err := HashPassword(password)
	if err != nil {
		return RegistrationResult{}, err
	}

	createdUser, err := s.repository.Create(ctx, User{
		Email:        email,
		PasswordHash: passwordHash,
		DisplayName:  displayName,
	})
	if err != nil {
		return RegistrationResult{}, err
	}

	return RegistrationResult{
		ID:          createdUser.ID,
		Email:       createdUser.Email,
		DisplayName: createdUser.DisplayName,
		CreatedAt:   createdUser.CreatedAt,
	}, nil
}
