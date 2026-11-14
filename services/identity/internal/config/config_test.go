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

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Neașteptat: a apărut o eroare: %v", err)
	}

	// Afișăm în consolă ce a returnat
	t.Logf("Config returnat cu succes: %+v", cfg)

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