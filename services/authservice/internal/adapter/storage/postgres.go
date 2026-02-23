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
		);
		CREATE TABLE IF NOT EXISTS user_settings (
			user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
			theme TEXT NOT NULL DEFAULT 'system',
			language TEXT NOT NULL DEFAULT 'ru',
			timezone TEXT NOT NULL DEFAULT 'UTC',
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS user_ssh_keys (
			id UUID PRIMARY KEY,
			user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name TEXT NOT NULL,
			public_key TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS admin_access_logs (
			id UUID PRIMARY KEY,
			username TEXT NOT NULL,
			success BOOLEAN NOT NULL,
			ip_address TEXT NOT NULL,
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

func (r *PostgresRepo) GetByID(ctx context.Context, userID string) (models.User, error) {
	var user models.User
	err := r.db.QueryRow(ctx, `
		SELECT id, email, password_hash, google_sub, role, created_at
		FROM users
		WHERE id = $1
	`, userID).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.GoogleSub, &user.Role, &user.CreatedAt)
	if err != nil {
		return models.User{}, errors.New("user not found")
	}
	return user, nil
}

func (r *PostgresRepo) UpsertSettings(ctx context.Context, settings models.UserSettings) (models.UserSettings, error) {
	err := r.db.QueryRow(ctx, `
		INSERT INTO user_settings (user_id, theme, language, timezone)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id) DO UPDATE SET
			theme = EXCLUDED.theme,
			language = EXCLUDED.language,
			timezone = EXCLUDED.timezone,
			updated_at = NOW()
		RETURNING updated_at
	`, settings.UserID, settings.Theme, settings.Language, settings.Timezone).Scan(&settings.UpdatedAt)
	return settings, err
}

func (r *PostgresRepo) GetSettings(ctx context.Context, userID string) (models.UserSettings, error) {
	var settings models.UserSettings
	err := r.db.QueryRow(ctx, `
		SELECT user_id, theme, language, timezone, updated_at
		FROM user_settings
		WHERE user_id = $1
	`, userID).Scan(&settings.UserID, &settings.Theme, &settings.Language, &settings.Timezone, &settings.UpdatedAt)
	if err != nil {
		return models.UserSettings{UserID: userID, Theme: "system", Language: "ru", Timezone: "UTC"}, nil
	}
	return settings, nil
}

func (r *PostgresRepo) ListSSHKeys(ctx context.Context, userID string) ([]models.SSHKey, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, name, public_key, created_at
		FROM user_ssh_keys
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	keys := make([]models.SSHKey, 0)
	for rows.Next() {
		var key models.SSHKey
		if err := rows.Scan(&key.ID, &key.UserID, &key.Name, &key.PublicKey, &key.CreatedAt); err != nil {
			return nil, err
		}
		keys = append(keys, key)
	}
	return keys, nil
}

func (r *PostgresRepo) CreateSSHKey(ctx context.Context, key models.SSHKey) (models.SSHKey, error) {
	key.ID = uuid.NewString()
	err := r.db.QueryRow(ctx, `
		INSERT INTO user_ssh_keys (id, user_id, name, public_key)
		VALUES ($1, $2, $3, $4)
		RETURNING created_at
	`, key.ID, key.UserID, key.Name, key.PublicKey).Scan(&key.CreatedAt)
	return key, err
}

func (r *PostgresRepo) DeleteSSHKey(ctx context.Context, userID string, keyID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM user_ssh_keys WHERE id = $1 AND user_id = $2`, keyID, userID)
	return err
}

func (r *PostgresRepo) LogAdminAccess(ctx context.Context, username string, success bool, ipAddress string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO admin_access_logs (id, username, success, ip_address)
		VALUES ($1, $2, $3, $4)
	`, uuid.NewString(), username, success, ipAddress)
	return err
}
