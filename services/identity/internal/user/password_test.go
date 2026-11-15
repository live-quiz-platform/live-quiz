package user

import "testing"

func TestHashPassword(t *testing.T) {
	password := "password123"

	firstHash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	secondHash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	if firstHash == secondHash {
		t.Fatal("expected different hashes for the same password")
	}

	match, err := VerifyPassword(password, firstHash)
	if err != nil {
		t.Fatalf("VerifyPassword() error = %v", err)
	}

	if !match {
		t.Fatal("expected password to match")
	}
}

func TestVerifyPasswordWithWrongPassword(t *testing.T) {
	hash, err := HashPassword("password123")
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	match, err := VerifyPassword("wrongpassword", hash)
	if err != nil {
		t.Fatalf("VerifyPassword() error = %v", err)
	}

	if match {
		t.Fatal("expected password not to match")
	}
}

func TestVerifyPasswordWithInvalidHash(t *testing.T) {
	_, err := VerifyPassword("password123", "invalid-hash")

	if err == nil {
		t.Fatal("expected an error for invalid hash")
	}
}
