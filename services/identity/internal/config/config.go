
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
	Secret            string
	ExpirationMinutes int
}

func Load() (Config, error) {
	port, err := portFromEnv("POSTGRES_DB_PORT")
	if err != nil {
		return Config{}, err
	}

	grpcPort, err := portFromEnv("IDENTITY_GRPC_PORT")
	if err != nil {
		return Config{}, err
	}

	jwtExpiration, err := strconv.Atoi(
		strings.TrimSpace(os.Getenv("IDENTITY_JWT_EXPIRATION_MINUTES")),
	)
	if err != nil || jwtExpiration <= 0 {
		return Config{}, fmt.Errorf("invalid IDENTITY_JWT_EXPIRATION_MINUTES")
	}

	cfg := Config{
		Postgres: PostgresConfig{
			Host:     strings.TrimSpace(os.Getenv("POSTGRES_HOST")),
			Port:     port,
			User:     strings.TrimSpace(os.Getenv("POSTGRES_USER_IDENTITY")),
			Password: os.Getenv("IDENTITY_DB_PASSWORD"),
			Database: strings.TrimSpace(os.Getenv("POSTGRES_IDENTITY_DB")),
			SSLMode:  strings.TrimSpace(os.Getenv("POSTGRES_SSL_MODE")),
		},
		GRPC: GRPCConfig{
			Port:        grpcPort,
			TLSCertFile: strings.TrimSpace(os.Getenv("IDENTITY_TLS_CERT_FILE")),
			TLSKeyFile:  strings.TrimSpace(os.Getenv("IDENTITY_TLS_KEY_FILE")),
		},
		JWT: JWTConfig{
			Secret:            os.Getenv("IDENTITY_JWT_SECRET"),
			ExpirationMinutes: jwtExpiration,
		},
	}

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

func portFromEnv(name string) (int, error) {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return 0, fmt.Errorf("missing required environment variable: %s", name)
	}

	port, err := strconv.Atoi(value)
	if err != nil || port < 1 || port > 65535 {
		return 0, fmt.Errorf("invalid %s: %s", name, value)
	}

	return port, nil
}
