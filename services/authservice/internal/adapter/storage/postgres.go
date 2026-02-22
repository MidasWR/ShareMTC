package storage

import (
	"context"
	"errors"

	"github.com/MidasWR/ShareMTC/services/authservice/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepo struct {
	db *pgxpool.Pool
}

func NewPostgresRepo(db *pgxpool.Pool) *PostgresRepo {
	return &PostgresRepo{db: db}
}

func (r *PostgresRepo) Migrate(ctx context.Context) error {
	_, err := r.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL DEFAULT '',
			google_sub TEXT UNIQUE,
			role TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	return err
}

func (r *PostgresRepo) CreateLocalUser(ctx context.Context, email string, passwordHash string, role string) (models.User, error) {
	user := models.User{
		ID:           uuid.NewString(),
		Email:        email,
		PasswordHash: passwordHash,
		Role:         role,
	}
	err := r.db.QueryRow(ctx, `
		INSERT INTO users (id, email, password_hash, role)
		VALUES ($1, $2, $3, $4)
		RETURNING created_at
	`, user.ID, user.Email, user.PasswordHash, user.Role).Scan(&user.CreatedAt)
	return user, err
}

func (r *PostgresRepo) GetByEmail(ctx context.Context, email string) (models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx, `
		SELECT id, email, password_hash, google_sub, role, created_at
		FROM users
		WHERE email = $1
	`, email).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.GoogleSub, &user.Role, &user.CreatedAt)
	if err != nil {
		return models.User{}, errors.New("user not found")
	}
	return user, nil
}

func (r *PostgresRepo) UpsertGoogleUser(ctx context.Context, email string, googleSub string, role string) (models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx, `
		INSERT INTO users (id, email, google_sub, role)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (email) DO UPDATE SET google_sub = EXCLUDED.google_sub
		RETURNING id, email, password_hash, google_sub, role, created_at
	`, uuid.NewString(), email, googleSub, role).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.GoogleSub, &user.Role, &user.CreatedAt,
	)
	return user, err
}
