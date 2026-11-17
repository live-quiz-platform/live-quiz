package user

import (
	"context"
	"time"
)

type FakeRepository struct {
	createdUser User
	foundUser   User

	createdRefreshToken RefreshToken
	rotatedUser         User

	createErr      error
	findErr        error
	createTokenErr error
	rotateTokenErr error
	revokeTokenErr error

	called            bool
	findCalled        bool
	createTokenCalled bool
	rotateTokenCalled bool
	revokeTokenCalled bool

	foundEmail        string
	rotatedTokenHash  string
	newTokenHash      string
	newTokenExpiresAt time.Time
	revokedTokenHash  string
}

func (r *FakeRepository) Create(
	ctx context.Context,
	newUser User,
) (User, error) {
	r.called = true

	if r.createErr != nil {
		return User{}, r.createErr
	}

	newUser.ID = "test-user-id"
	newUser.CreatedAt = time.Now()

	r.createdUser = newUser

	return newUser, nil
}

func (r *FakeRepository) FindByEmail(
	ctx context.Context,
	email string,
) (User, error) {
	r.findCalled = true
	r.foundEmail = email

	if r.findErr != nil {
		return User{}, r.findErr
	}

	if r.foundUser.ID == "" {
		return User{}, ErrInvalidCredentials
	}

	return r.foundUser, nil
}

func (r *FakeRepository) CreateRefreshToken(
	ctx context.Context,
	token RefreshToken,
) error {
	r.createTokenCalled = true

	if r.createTokenErr != nil {
		return r.createTokenErr
	}

	r.createdRefreshToken = token

	return nil
}

func (r *FakeRepository) RotateRefreshToken(
	ctx context.Context,
	currentTokenHash string,
	newTokenHash string,
	expiresAt time.Time,
) (User, error) {
	r.rotateTokenCalled = true
	r.rotatedTokenHash = currentTokenHash
	r.newTokenHash = newTokenHash
	r.newTokenExpiresAt = expiresAt

	if r.rotateTokenErr != nil {
		return User{}, r.rotateTokenErr
	}

	return r.rotatedUser, nil
}

func (r *FakeRepository) RevokeRefreshToken(
	ctx context.Context,
	tokenHash string,
) error {
	r.revokeTokenCalled = true
	r.revokedTokenHash = tokenHash

	return r.revokeTokenErr
}
