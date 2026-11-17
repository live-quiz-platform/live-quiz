package config

import "testing"

func setValidEnv(t *testing.T) {
	t.Helper()

	t.Setenv("POSTGRES_DB_PORT", "5432")
	t.Setenv("POSTGRES_HOST", "localhost")
	t.Setenv("POSTGRES_USER_IDENTITY", "postgres_user")
	t.Setenv("IDENTITY_DB_PASSWORD", "secret_pass")
	t.Setenv("POSTGRES_IDENTITY_DB", "identity_db")
	t.Setenv("POSTGRES_SSL_MODE", "disable")
	t.Setenv("IDENTITY_GRPC_PORT", "50051")
	t.Setenv("IDENTITY_TLS_CERT_FILE", "/run/secrets/identity_tls_cert")
	t.Setenv("IDENTITY_TLS_KEY_FILE", "/run/secrets/identity_tls_key")
	t.Setenv("IDENTITY_JWT_SECRET", "this-is-a-test-secret-with-at-least-32-characters")
	t.Setenv("IDENTITY_JWT_EXPIRATION_MINUTES", "15")
	t.Setenv("IDENTITY_REFRESH_TOKEN_EXPIRATION_DAYS", "7")
}

func TestLoad_Success(t *testing.T) {
	setValidEnv(t)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if cfg.Postgres.Port != 5432 {
		t.Errorf("Expected PostgreSQL port 5432, got %d", cfg.Postgres.Port)
	}
	if cfg.Postgres.User != "postgres_user" {
		t.Errorf("Expected user postgres_user, got %s", cfg.Postgres.User)
	}
	if cfg.GRPC.Port != 50051 {
		t.Errorf("Expected gRPC port 50051, got %d", cfg.GRPC.Port)
	}
	if cfg.GRPC.TLSCertFile != "/run/secrets/identity_tls_cert" {
		t.Errorf("Unexpected gRPC TLS certificate file: %s", cfg.GRPC.TLSCertFile)
	}
	if cfg.GRPC.TLSKeyFile != "/run/secrets/identity_tls_key" {
		t.Errorf("Unexpected gRPC TLS key file: %s", cfg.GRPC.TLSKeyFile)
	}
	if cfg.JWT.Secret != "this-is-a-test-secret-with-at-least-32-characters" {
		t.Error("Unexpected JWT secret")
	}
	if cfg.JWT.ExpirationMinutes != 15 {
		t.Errorf("Expected JWT expiration 15 minutes, got %d", cfg.JWT.ExpirationMinutes)
	}
	if cfg.JWT.RefreshTokenExpirationDays != 7 {
		t.Errorf("Expected refresh token expiration 7 days, got %d", cfg.JWT.RefreshTokenExpirationDays)
	}
}

func TestLoad_MissingPort(t *testing.T) {
	setValidEnv(t)
	t.Setenv("POSTGRES_DB_PORT", "")

	_, err := Load()
	if err == nil {
		t.Fatal("Expected error for missing PostgreSQL port, got nil")
	}
}

func TestLoad_MissingGRPCPort(t *testing.T) {
	setValidEnv(t)
	t.Setenv("IDENTITY_GRPC_PORT", "")

	_, err := Load()
	if err == nil {
		t.Fatal("Expected error for missing IDENTITY_GRPC_PORT")
	}
}

func TestLoad_MissingTLSFiles(t *testing.T) {
	tests := []struct {
		name    string
		envName string
		wantErr string
	}{
		{
			name:    "certificate file",
			envName: "IDENTITY_TLS_CERT_FILE",
			wantErr: "missing required environment variable: IDENTITY_TLS_CERT_FILE",
		},
		{
			name:    "key file",
			envName: "IDENTITY_TLS_KEY_FILE",
			wantErr: "missing required environment variable: IDENTITY_TLS_KEY_FILE",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setValidEnv(t)
			t.Setenv(tt.envName, "")

			_, err := Load()
			if err == nil || err.Error() != tt.wantErr {
				t.Fatalf("Load() error = %v, want %q", err, tt.wantErr)
			}
		})
	}
}

func TestLoad_InvalidPort(t *testing.T) {
	tests := []struct {
		name    string
		envName string
		value   string
		wantErr string
	}{
		{
			name:    "PostgreSQL port is not a number",
			envName: "POSTGRES_DB_PORT",
			value:   "abc",
			wantErr: "invalid POSTGRES_DB_PORT: abc",
		},
		{
			name:    "PostgreSQL port is out of range",
			envName: "POSTGRES_DB_PORT",
			value:   "65536",
			wantErr: "invalid POSTGRES_DB_PORT: 65536",
		},
		{
			name:    "gRPC port is out of range",
			envName: "IDENTITY_GRPC_PORT",
			value:   "0",
			wantErr: "invalid IDENTITY_GRPC_PORT: 0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setValidEnv(t)
			t.Setenv(tt.envName, tt.value)

			_, err := Load()
			if err == nil || err.Error() != tt.wantErr {
				t.Fatalf("Load() error = %v, want %q", err, tt.wantErr)
			}
		})
	}
}

func TestLoad_InvalidRefreshTokenExpiration(t *testing.T) {
	tests := []struct {
		name    string
		value   string
		wantErr string
	}{
		{
			name:    "missing value",
			value:   "",
			wantErr: "missing required environment variable: IDENTITY_REFRESH_TOKEN_EXPIRATION_DAYS",
		},
		{
			name:    "not a number",
			value:   "abc",
			wantErr: "invalid IDENTITY_REFRESH_TOKEN_EXPIRATION_DAYS: abc",
		},
		{
			name:    "zero",
			value:   "0",
			wantErr: "invalid IDENTITY_REFRESH_TOKEN_EXPIRATION_DAYS: 0",
		},
		{
			name:    "negative value",
			value:   "-7",
			wantErr: "invalid IDENTITY_REFRESH_TOKEN_EXPIRATION_DAYS: -7",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			setValidEnv(t)
			t.Setenv("IDENTITY_REFRESH_TOKEN_EXPIRATION_DAYS", tt.value)

			_, err := Load()
			if err == nil || err.Error() != tt.wantErr {
				t.Fatalf("Load() error = %v, want %q", err, tt.wantErr)
			}
		})
	}
}
