package token

import "testing"

func TestGenerateRefreshToken(t *testing.T) {
	token1, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	token2, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if token1 == "" {
		t.Fatal("expected a non-empty token")
	}

	if token1 == token2 {
		t.Fatal("expected two different tokens")
	}

	if len(token1) != 43 {
		t.Errorf("expected token length 43, got %d", len(token1))
	}
}

func TestHashRefreshToken(t *testing.T) {
	refreshToken := "test-refresh-token"

	hash1 := HashRefreshToken(refreshToken)
	hash2 := HashRefreshToken(refreshToken)

	if hash1 != hash2 {
		t.Fatal("expected the same input to produce the same hash")
	}

	if hash1 == refreshToken {
		t.Fatal("expected hash to differ from the original token")
	}

	if len(hash1) != 64 {
		t.Errorf("expected hash length 64, got %d", len(hash1))
	}

	if HashRefreshToken("another-token") == hash1 {
		t.Fatal("expected different tokens to produce different hashes")
	}
}

func TestGenerateRefreshTokenFamilyID(t *testing.T) {
	first, err := GenerateRefreshTokenFamilyID()
	if err != nil {
		t.Fatalf("generate first family ID: %v", err)
	}

	second, err := GenerateRefreshTokenFamilyID()
	if err != nil {
		t.Fatalf("generate second family ID: %v", err)
	}

	if len(first) != 36 {
		t.Errorf("expected UUID length 36, got %d", len(first))
	}
	if first == second {
		t.Error("expected unique family IDs")
	}
}
