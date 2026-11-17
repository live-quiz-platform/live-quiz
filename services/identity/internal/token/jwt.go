package token

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrInvalidInput = errors.New("user ID and role are required")
)

type Claims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

type Manager struct {
	secret     []byte
	expiration time.Duration
}

func NewManager(secret string, expiration time.Duration) (*Manager, error) {
	if len(secret) < 32 {
		return nil, errors.New("JWT secret must contain at least 32 characters")
	}

	if expiration <= 0 {
		return nil, errors.New("JWT expiration must be positive")
	}

	return &Manager{
		secret:     []byte(secret),
		expiration: expiration,
	}, nil
}

func (m *Manager) Generate(userID, role string) (string, time.Time, error) {
	userID = strings.TrimSpace(userID)
	role = strings.TrimSpace(role)

	if userID == "" || role == "" {
		return "", time.Time{}, ErrInvalidInput
	}

	now := time.Now()
	expiresAt := now.Add(m.expiration)

	claims := Claims{
		Role:      role,
		Subject:   userID,
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(expiresAt),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signedToken, err := token.SignedString(m.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign JWT: %w", err)
	}

	return signedToken, expiresAt, nil
}

func (m *Manager) Validate(tokenString string) (*Claims, error) {
	if strings.TrimSpace(tokenString) == "" {
		return nil, ErrInvalidToken
	}

	claims := &Claims{}

	token, err := jwt.ParseWithClaims(
		tokenString,
		claims,
		func(token *jwt.Token) (any, error) {
			return m.secret, nil
		},
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
	)
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}

	if claims.Subject == "" || claims.Role == "" {
		return nil, ErrInvalidToken
	}

	return claims, nil
}
