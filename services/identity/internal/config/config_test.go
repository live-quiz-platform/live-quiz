package config

import (
	"testing"
)

func TestLoad_Success(t *testing.T) {
	// Setăm variabilele de mediu pentru test
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

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Neașteptat: a apărut o eroare: %v", err)
	}

	// Validări
	if cfg.Postgres.Port != 5432 {
		t.Errorf("Așteptat port 5432, primit %d", cfg.Postgres.Port)
	}
	if cfg.Postgres.User != "postgres_user" {
		t.Errorf("Așteptat user postgres_user, primit %s", cfg.Postgres.User)
	}
	if cfg.GRPC.Port != 50051 {
		t.Errorf("Așteptat port gRPC 50051, primit %d", cfg.GRPC.Port)
	}
	if cfg.GRPC.TLSCertFile != "/run/secrets/identity_tls_cert" {
		t.Errorf("Unexpected gRPC TLS certificate file: %s", cfg.GRPC.TLSCertFile)
	}
	if cfg.GRPC.TLSKeyFile != "/run/secrets/identity_tls_key" {
		t.Errorf("Unexpected gRPC TLS key file: %s", cfg.GRPC.TLSKeyFile)
	}
	if cfg.JWT.Secret != "this-is-a-test-secret-with-at-least-32-characters" {
		t.Errorf("Unexpected JWT secret")
	}
	if cfg.JWT.ExpirationMinutes != 15 {
		t.Errorf("Expected JWT expiration 15 minutes, got %d", cfg.JWT.ExpirationMinutes)
	}
}

func TestLoad_MissingPort(t *testing.T) {
	t.Setenv("POSTGRES_DB_PORT", "")

	_, err := Load()
	if err == nil {
		t.Fatal("Așteptam eroare pentru lipsă port, dar err a fost nil")
	}
	t.Logf("Eroare primită conform așteptărilor: %v", err)
}

func TestLoad_MissingGRPCPort(t *testing.T) {
	t.Setenv("POSTGRES_DB_PORT", "5432")
	t.Setenv("IDENTITY_GRPC_PORT", "")

	_, err := Load()
	if err == nil {
		t.Fatal("Așteptam eroare pentru lipsa IDENTITY_GRPC_PORT")
	}
}

func TestLoad_MissingTLSFiles(t *testing.T) {
	for _, tt := range []struct {
		name     string
		certFile string
		keyFile  string
		wantErr  string
	}{
		{
			name:    "certificate file",
			keyFile: "/run/secrets/identity_tls_key",
			wantErr: "missing required environment variable: IDENTITY_TLS_CERT_FILE",
		},
		{
			name:     "key file",
			certFile: "/run/secrets/identity_tls_cert",
			wantErr:  "missing required environment variable: IDENTITY_TLS_KEY_FILE",
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("POSTGRES_DB_PORT", "5432")
			t.Setenv("IDENTITY_GRPC_PORT", "50051")
			t.Setenv("POSTGRES_HOST", "localhost")
			t.Setenv("POSTGRES_USER_IDENTITY", "postgres_user")
			t.Setenv("IDENTITY_DB_PASSWORD", "secret_pass")
			t.Setenv("POSTGRES_IDENTITY_DB", "identity_db")
			t.Setenv("POSTGRES_SSL_MODE", "disable")
			t.Setenv("IDENTITY_TLS_CERT_FILE", tt.certFile)
			t.Setenv("IDENTITY_TLS_KEY_FILE", tt.keyFile)
			t.Setenv("IDENTITY_JWT_SECRET", "this-is-a-test-secret-with-at-least-32-characters")
			t.Setenv("IDENTITY_JWT_EXPIRATION_MINUTES", "15")

			_, err := Load()
			if err == nil || err.Error() != tt.wantErr {
				t.Fatalf("Load() error = %v, want %q", err, tt.wantErr)
			}
		})
	}
}

func TestLoad_InvalidPort(t *testing.T) {
	tests := []struct {
		name         string
		postgresPort string
		grpcPort     string
		wantErr      string
	}{
		{
			name:         "PostgreSQL port is not a number",
			postgresPort: "abc",
			grpcPort:     "50051",
			wantErr:      "invalid POSTGRES_DB_PORT: abc",
		},
		{
			name:         "PostgreSQL port is out of range",
			postgresPort: "65536",
			grpcPort:     "50051",
			wantErr:      "invalid POSTGRES_DB_PORT: 65536",
		},
		{
			name:         "gRPC port is out of range",
			postgresPort: "5432",
			grpcPort:     "0",
			wantErr:      "invalid IDENTITY_GRPC_PORT: 0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("POSTGRES_DB_PORT", tt.postgresPort)
			t.Setenv("IDENTITY_GRPC_PORT", tt.grpcPort)

			_, err := Load()
			if err == nil || err.Error() != tt.wantErr {
				t.Fatalf("Load() error = %v, want %q", err, tt.wantErr)
			}
		})
	}
}
