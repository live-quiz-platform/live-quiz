package user

import (
	"errors"
	"testing"
)

func TestValidateRegistration(t *testing.T) {
	tests := []struct {
		name        string
		email       string
		password    string
		displayName string
		wantErr     error
	}{
		{
			name:        "valid registration",
			email:       "student@example.com",
			password:    "password123",
			displayName: "Student",
			wantErr:     nil,
		},
		{
			name:        "invalid email",
			email:       "invalid-email",
			password:    "password123",
			displayName: "Student",
			wantErr:     ErrInvalidEmail,
		},
		{
			name:        "email with display name",
			email:       "Student <student@example.com>",
			password:    "password123",
			displayName: "Student",
			wantErr:     ErrInvalidEmail,
		},
		{
			name:        "password too short",
			email:       "student@example.com",
			password:    "short",
			displayName: "Student",
			wantErr:     ErrPasswordTooShort,
		},
		{
			name:        "empty display name",
			email:       "student@example.com",
			password:    "password123",
			displayName: "",
			wantErr:     ErrInvalidDisplayName,
		},
		{
			name:        "display name contains only whitespace",
			email:       "student@example.com",
			password:    "password123",
			displayName: "   ",
			wantErr:     ErrInvalidDisplayName,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateRegistration(
				tt.email,
				tt.password,
				tt.displayName,
			)

			if !errors.Is(err, tt.wantErr) {
				t.Errorf("expected error %v, got %v", tt.wantErr, err)
			}
		})
	}
}
