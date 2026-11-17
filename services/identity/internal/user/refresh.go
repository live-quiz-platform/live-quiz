package user

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/live-quiz-platform/live-quiz/services/identity/internal/token"
)

type RefreshTokenService struct {
	repository Repository
	expiration time.Duration
}

type IssuedRefreshToken struct {
	Token     string
	ExpiresAt time.Time
}

type RotatedRefreshToken struct {
	User      User
	Token     string
	ExpiresAt time.Time
}

func NewRefreshTokenService(
	repository Repository,
	expiration time.Duration,
) (*RefreshTokenService, error) {
	if repository == nil {
		return nil, errors.New("refresh token repository is required")
	}
	if expiration <= 0 {
		return nil, errors.New("refresh token expiration must be positive")
	}

	return &RefreshTokenService{
		repository: repository,
		expiration: expiration,
	}, nil
}

func (s *RefreshTokenService) Issue(
	ctx context.Context,
	userID string,
) (IssuedRefreshToken, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return IssuedRefreshToken{}, errors.New("user ID is required")
	}

	refreshToken, err := token.GenerateRefreshToken()
	if err != nil {
		return IssuedRefreshToken{}, err
	}

	familyID, err := token.GenerateRefreshTokenFamilyID()
	if err != nil {
		return IssuedRefreshToken{}, err
	}

	expiresAt := time.Now().Add(s.expiration)
	err = s.repository.CreateRefreshToken(ctx, RefreshToken{
		UserID:    userID,
		TokenHash: token.HashRefreshToken(refreshToken),
		FamilyID:  familyID,
		ExpiresAt: expiresAt,
	})
	if err != nil {
		return IssuedRefreshToken{}, err
	}

	return IssuedRefreshToken{
		Token:     refreshToken,
		ExpiresAt: expiresAt,
	}, nil
}

func (s *RefreshTokenService) Rotate(
	ctx context.Context,
	currentToken string,
) (RotatedRefreshToken, error) {
	currentToken = strings.TrimSpace(currentToken)
	if currentToken == "" {
		return RotatedRefreshToken{}, ErrInvalidRefreshToken
	}

	nextToken, err := token.GenerateRefreshToken()
	if err != nil {
		return RotatedRefreshToken{}, err
	}

	expiresAt := time.Now().Add(s.expiration)
	refreshedUser, err := s.repository.RotateRefreshToken(
		ctx,
		token.HashRefreshToken(currentToken),
		token.HashRefreshToken(nextToken),
		expiresAt,
	)
	if err != nil {
		return RotatedRefreshToken{}, err
	}

	return RotatedRefreshToken{
		User:      refreshedUser,
		Token:     nextToken,
		ExpiresAt: expiresAt,
	}, nil
}

func (s *RefreshTokenService) Revoke(
	ctx context.Context,
	refreshToken string,
) error {
	refreshToken = strings.TrimSpace(refreshToken)
	if refreshToken == "" {
		return ErrInvalidRefreshToken
	}

	return s.repository.RevokeRefreshToken(
		ctx,
		token.HashRefreshToken(refreshToken),
	)
}
