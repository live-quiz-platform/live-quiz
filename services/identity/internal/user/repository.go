package user

import "context"

type Repository interface {
	Create(ctx context.Context, newUser User) (User, error)
	FindByEmail(ctx context.Context, email string) (User, error)
}
