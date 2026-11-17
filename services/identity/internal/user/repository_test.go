package user

import (
	"context"
	"time"
)

type FakeRepository struct {
	createdUser User
	foundUser   User

	createErr error
	findErr   error

	called     bool
	findCalled bool
	foundEmail string
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