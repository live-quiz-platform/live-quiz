package user

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

const (
	argon2Memory      = 64 * 1024
	argon2Iterations  = 3
	argon2Parallelism = 2
	saltLength        = 16
	hashLength        = 32
)

func HashPassword(password string) (string, error) {
	salt := make([]byte, saltLength)

	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate password salt: %w", err)
	}

	hash := argon2.IDKey(
		[]byte(password),
		salt,
		argon2Iterations,
		argon2Memory,
		argon2Parallelism,
		hashLength,
	)

	encodedSalt := base64.RawStdEncoding.EncodeToString(salt)
	encodedHash := base64.RawStdEncoding.EncodeToString(hash)

	encoded := fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		argon2Memory,
		argon2Iterations,
		argon2Parallelism,
		encodedSalt,
		encodedHash,
	)

	return encoded, nil
}

func VerifyPassword(password string, encodedHash string) (bool, error) {
	parsedHash, err := parsePasswordHash(encodedHash)
	if err != nil {
		return false, err
	}

	actualHash := argon2.IDKey(
		[]byte(password),
		parsedHash.salt,
		parsedHash.iterations,
		parsedHash.memory,
		parsedHash.parallelism,
		uint32(len(parsedHash.hash)),
	)

	return subtle.ConstantTimeCompare(actualHash, parsedHash.hash) == 1, nil
}

type parsedPasswordHash struct {
	salt        []byte
	hash        []byte
	memory      uint32
	iterations  uint32
	parallelism uint8
}

func parsePasswordHash(encodedHash string) (parsedPasswordHash, error) {
	parts := strings.Split(encodedHash, "$")

	if len(parts) != 6 || parts[0] != "" || parts[1] != "argon2id" {
		return parsedPasswordHash{}, fmt.Errorf("invalid password hash format")
	}

	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil {
		return parsedPasswordHash{}, fmt.Errorf("invalid Argon2 version: %w", err)
	}

	if version != argon2.Version {
		return parsedPasswordHash{}, fmt.Errorf("unsupported Argon2 version: %d", version)
	}

	var memory, iterations, parallelism uint32

	if _, err := fmt.Sscanf(
		parts[3],
		"m=%d,t=%d,p=%d",
		&memory,
		&iterations,
		&parallelism,
	); err != nil {
		return parsedPasswordHash{}, fmt.Errorf("invalid Argon2 parameters: %w", err)
	}

	// Reject unreasonable parameters to prevent excessive resource usage.
	if memory < 8*parallelism || memory > 1024*1024 ||
		iterations == 0 || iterations > 10 ||
		parallelism == 0 || parallelism > 16 {
		return parsedPasswordHash{}, fmt.Errorf("invalid Argon2 parameters")
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil || len(salt) < 8 || len(salt) > 64 {
		return parsedPasswordHash{}, fmt.Errorf("invalid password salt")
	}

	expectedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil || len(expectedHash) == 0 || len(expectedHash) > 64 {
		return parsedPasswordHash{}, fmt.Errorf("invalid password hash")
	}

	return parsedPasswordHash{
		salt:        salt,
		hash:        expectedHash,
		memory:      memory,
		iterations:  iterations,
		parallelism: uint8(parallelism),
	}, nil
}
