package models

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	GoogleSub    string    `json:"google_sub,omitempty"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}
