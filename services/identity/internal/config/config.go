package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Postgres PostgresConfig
	GRPC     GRPCConfig
	JWT      JWTConfig
}

type PostgresConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Database string
	SSLMode  string
}

type GRPCConfig struct {
	Port        int
	TLSCertFile string
	TLSKeyFile  string
}

type JWTConfig struct {
	Secret                     string
	ExpirationMinutes          int
	RefreshTokenExpirationDays int
}

func Load() (Config, error) {
	// Read environment variables.
	env := struct {
		PostgresHost           string
		PostgresPort           string
		PostgresUser           string
		PostgresPassword       string
		PostgresDatabase       string
		PostgresSSLMode        string
		GRPCPort               string
		GRPCTLSCertFile        string
		GRPCTLSKeyFile         string
		JWTSecret              string
		JWTExpiration          string
		RefreshTokenExpiration string
	}{
		PostgresHost:           strings.TrimSpace(os.Getenv("POSTGRES_HOST")),
		PostgresPort:           strings.TrimSpace(os.Getenv("POSTGRES_DB_PORT")),
		PostgresUser:           strings.TrimSpace(os.Getenv("POSTGRES_USER_IDENTITY")),
		PostgresPassword:       os.Getenv("IDENTITY_DB_PASSWORD"),
		PostgresDatabase:       strings.TrimSpace(os.Getenv("POSTGRES_IDENTITY_DB")),
		PostgresSSLMode:        strings.TrimSpace(os.Getenv("POSTGRES_SSL_MODE")),
		GRPCPort:               strings.TrimSpace(os.Getenv("IDENTITY_GRPC_PORT")),
		GRPCTLSCertFile:        strings.TrimSpace(os.Getenv("IDENTITY_TLS_CERT_FILE")),
		GRPCTLSKeyFile:         strings.TrimSpace(os.Getenv("IDENTITY_TLS_KEY_FILE")),
		JWTSecret:              os.Getenv("IDENTITY_JWT_SECRET"),
		JWTExpiration:          strings.TrimSpace(os.Getenv("IDENTITY_JWT_EXPIRATION_MINUTES")),
		RefreshTokenExpiration: strings.TrimSpace(os.Getenv("IDENTITY_REFRESH_TOKEN_EXPIRATION_DAYS")),
	}

	// Parse numeric environment variables.
	postgresPort, err := parsePort("POSTGRES_DB_PORT", env.PostgresPort)
	if err != nil {
		return Config{}, err
	}

	grpcPort, err := parsePort("IDENTITY_GRPC_PORT", env.GRPCPort)
	if err != nil {
		return Config{}, err
	}

	jwtExpiration, err := parsePositiveInt(
		"IDENTITY_JWT_EXPIRATION_MINUTES",
		env.JWTExpiration,
	)
	if err != nil {
		return Config{}, err
	}

	refreshTokenExpiration, err := parsePositiveInt(
		"IDENTITY_REFRESH_TOKEN_EXPIRATION_DAYS",
		env.RefreshTokenExpiration,
	)
	if err != nil {
		return Config{}, err
	}

	// Build configuration.
	cfg := Config{
		Postgres: PostgresConfig{
			Host:     env.PostgresHost,
			Port:     postgresPort,
			User:     env.PostgresUser,
			Password: env.PostgresPassword,
			Database: env.PostgresDatabase,
			SSLMode:  env.PostgresSSLMode,
		},
		GRPC: GRPCConfig{
			Port:        grpcPort,
			TLSCertFile: env.GRPCTLSCertFile,
			TLSKeyFile:  env.GRPCTLSKeyFile,
		},
		JWT: JWTConfig{
			Secret:                     env.JWTSecret,
			ExpirationMinutes:          jwtExpiration,
			RefreshTokenExpirationDays: refreshTokenExpiration,
		},
	}

	// Validate required environment variables.
	switch {
	case cfg.Postgres.Host == "":
		return Config{}, fmt.Errorf("missing required environment variable: POSTGRES_HOST")
	case cfg.Postgres.User == "":
		return Config{}, fmt.Errorf("missing required environment variable: POSTGRES_USER_IDENTITY")
	case cfg.Postgres.Password == "":
		return Config{}, fmt.Errorf("missing required environment variable: IDENTITY_DB_PASSWORD")
	case cfg.Postgres.Database == "":
		return Config{}, fmt.Errorf("missing required environment variable: POSTGRES_IDENTITY_DB")
	case cfg.Postgres.SSLMode == "":
		return Config{}, fmt.Errorf("missing required environment variable: POSTGRES_SSL_MODE")
	case cfg.GRPC.TLSCertFile == "":
		return Config{}, fmt.Errorf("missing required environment variable: IDENTITY_TLS_CERT_FILE")
	case cfg.GRPC.TLSKeyFile == "":
		return Config{}, fmt.Errorf("missing required environment variable: IDENTITY_TLS_KEY_FILE")
	case len(cfg.JWT.Secret) < 32:
		return Config{}, fmt.Errorf("IDENTITY_JWT_SECRET must contain at least 32 characters")
	}

	return cfg, nil
}

func parsePort(name, value string) (int, error) {
	if value == "" {
		return 0, fmt.Errorf("missing required environment variable: %s", name)
	}

	port, err := strconv.Atoi(value)
	if err != nil || port < 1 || port > 65535 {
		return 0, fmt.Errorf("invalid %s: %s", name, value)
	}

	return port, nil
}

func parsePositiveInt(name, value string) (int, error) {
	if value == "" {
		return 0, fmt.Errorf("missing required environment variable: %s", name)
	}

	number, err := strconv.Atoi(value)
	if err != nil || number <= 0 {
		return 0, fmt.Errorf("invalid %s: %s", name, value)
	}

	return number, nil
}
