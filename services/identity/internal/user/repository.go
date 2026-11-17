package user

import (
	"context"
	"time"
)

type Repository interface {
	Create(ctx context.Context, newUser User) (User, error)
	FindByEmail(ctx context.Context, email string) (User, error)
	CreateRefreshToken(ctx context.Context, token RefreshToken) error
	RotateRefreshToken(
		ctx context.Context,
		currentTokenHash string,
		newTokenHash string,
		expiresAt time.Time,
	) (User, error)
	RevokeRefreshToken(ctx context.Context, tokenHash string) error
}
