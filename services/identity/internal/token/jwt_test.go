package token

import (
	"testing"
	"time"
)

func TestGenerateAndValidate(t *testing.T) {
	manager, err := NewManager(
		"this-is-a-test-secret-with-more-than-32-characters",
		15*time.Minute,
	)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	tokenString, expiresAt, err := manager.Generate("user-123", "student")
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	if tokenString == "" {
		t.Fatal("Generate() returned an empty token")
	}

	if !expiresAt.After(time.Now()) {
		t.Fatal("Generate() returned an expiration time in the past")
	}

	claims, err := manager.Validate(tokenString)
	if err != nil {
		t.Fatalf("Validate() error = %v", err)
	}

	if claims.Subject != "user-123" {
		t.Errorf("Subject = %q, want %q", claims.Subject, "user-123")
	}

	if claims.Role != "student" {
		t.Errorf("Role = %q, want %q", claims.Role, "student")
	}

	if claims.ExpiresAt == nil {
		t.Fatal("ExpiresAt claim is missing")
	}

	if !claims.ExpiresAt.Time.Equal(expiresAt.Truncate(time.Second)) {
		t.Errorf("ExpiresAt = %v, want %v", claims.ExpiresAt.Time, expiresAt.Truncate(time.Second))
	}
}

func TestValidateExpiredToken(t *testing.T) {
	manager, err := NewManager(
		"this-is-a-test-secret-with-more-than-32-characters",
		-1*time.Second,
	)
	if err == nil {
		t.Fatal("NewManager() should reject a non-positive expiration")
	}

	manager, err = NewManager(
		"this-is-a-test-secret-with-more-than-32-characters",
		time.Second,
	)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	tokenString, _, err := manager.Generate("user-123", "student")
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	time.Sleep(1100 * time.Millisecond)

	_, err = manager.Validate(tokenString)
	if err == nil {
		t.Fatal("Validate() should reject an expired token")
	}
}

func TestValidateInvalidSignature(t *testing.T) {
	manager, err := NewManager(
		"this-is-a-test-secret-with-more-than-32-characters",
		15*time.Minute,
	)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	tokenString, _, err := manager.Generate("user-123", "student")
	if err != nil {
		t.Fatalf("Generate() error = %v", err)
	}

	otherManager, err := NewManager(
		"a-different-test-secret-with-more-than-32-characters",
		15*time.Minute,
	)
	if err != nil {
		t.Fatalf("NewManager() error = %v", err)
	}

	_, err = otherManager.Validate(tokenString)
	if err == nil {
		t.Fatal("Validate() should reject a token signed with a different secret")
	}
}
