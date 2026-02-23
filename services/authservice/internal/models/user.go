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

type UserSettings struct {
	UserID    string    `json:"user_id"`
	Theme     string    `json:"theme"`
	Language  string    `json:"language"`
	Timezone  string    `json:"timezone"`
	UpdatedAt time.Time `json:"updated_at"`
}

type SSHKey struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Name      string    `json:"name"`
	PublicKey string    `json:"public_key"`
	CreatedAt time.Time `json:"created_at"`
}

type AdminAccessLog struct {
	ID        string    `json:"id"`
	Username  string    `json:"username"`
	Success   bool      `json:"success"`
	IPAddress string    `json:"ip_address"`
	CreatedAt time.Time `json:"created_at"`
}
