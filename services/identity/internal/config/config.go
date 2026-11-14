
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
	Port int
}

func Load() (Config, error) {
	// PostgreSQL port
	portStr := strings.TrimSpace(os.Getenv("POSTGRES_DB_PORT"))
	if portStr == "" {
		return Config{}, fmt.Errorf("missing required environment variable: POSTGRES_DB_PORT")
	}

	port, err := strconv.Atoi(portStr)
	if err != nil || port < 1 || port > 65535 {
		return Config{}, fmt.Errorf("invalid POSTGRES_DB_PORT: %s", portStr)
	}

	// gRPC port
	grpcPortStr := strings.TrimSpace(os.Getenv("IDENTITY_GRPC_PORT"))
	if grpcPortStr == "" {
		return Config{}, fmt.Errorf("missing required environment variable: IDENTITY_GRPC_PORT")
	}

	grpcPort, err := strconv.Atoi(grpcPortStr)
	if err != nil || grpcPort < 1 || grpcPort > 65535 {
		return Config{}, fmt.Errorf("invalid IDENTITY_GRPC_PORT: %s", grpcPortStr)
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
			Port: grpcPort,
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
	}

	return cfg, nil
}
