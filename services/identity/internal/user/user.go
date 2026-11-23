package user

import "time"

type User struct {
	ID           string
	Email        string
	PasswordHash string
	DisplayName  string
	Role         string
	IsActive     bool
	CreatedAt    time.Time
}
