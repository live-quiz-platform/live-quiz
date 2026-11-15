package user

import (
	"net/mail"
	"strings"
	"unicode/utf8"
)

func ValidateRegistration(
	email string,
	password string,
	displayName string,
) error {
	email = strings.TrimSpace(email)

	parsedEmail, err := mail.ParseAddress(email)
	if err != nil || parsedEmail.Address != email {
		return ErrInvalidEmail
	}

	if utf8.RuneCountInString(password) < 8 {
		return ErrPasswordTooShort
	}

	if strings.TrimSpace(displayName) == "" {
		return ErrInvalidDisplayName
	}

	return nil
}
