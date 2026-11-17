package user

import "time"

type RefreshToken struct {
    ID        string
    UserID    string
    TokenHash string
    FamilyID  string
    ExpiresAt time.Time
    CreatedAt time.Time
    UsedAt    *time.Time
    RevokedAt *time.Time
}