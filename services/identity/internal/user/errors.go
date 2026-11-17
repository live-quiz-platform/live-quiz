package user

import "errors"

var (
	ErrEmailAlreadyExists  = errors.New("email already exists")
	ErrInvalidEmail        = errors.New("email is invalid")
	ErrPasswordTooShort    = errors.New("password must contain at least 8 characters")
	ErrInvalidDisplayName  = errors.New("display name is required")
	ErrInvalidCredentials  = errors.New("invalid email or password")
	ErrInvalidRefreshToken = errors.New("invalid refresh token")
	ErrRefreshTokenReused  = errors.New("refresh token reuse detected")
)
