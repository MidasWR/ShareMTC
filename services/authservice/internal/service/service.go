package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/MidasWR/ShareMTC/services/authservice/internal/models"
	sdkauth "github.com/MidasWR/ShareMTC/services/sdk/auth"
	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"
)

type UserRepository interface {
	CreateLocalUser(ctx context.Context, email string, passwordHash string, role string) (models.User, error)
	GetByEmail(ctx context.Context, email string) (models.User, error)
	UpsertGoogleUser(ctx context.Context, email string, googleSub string, role string) (models.User, error)
	GetByID(ctx context.Context, userID string) (models.User, error)
	UpsertSettings(ctx context.Context, settings models.UserSettings) (models.UserSettings, error)
	GetSettings(ctx context.Context, userID string) (models.UserSettings, error)
	ListSSHKeys(ctx context.Context, userID string) ([]models.SSHKey, error)
	CreateSSHKey(ctx context.Context, key models.SSHKey) (models.SSHKey, error)
	DeleteSSHKey(ctx context.Context, userID string, keyID string) error
	LogAdminAccess(ctx context.Context, username string, success bool, ipAddress string) error
}

type AuthService struct {
	repo      UserRepository
	jwtSecret string
	tokenTTL  time.Duration
}

func New(repo UserRepository, jwtSecret string, tokenTTL time.Duration) *AuthService {
	log.Info().Dur("token_ttl", tokenTTL).Msg("auth service initialized")
	return &AuthService{repo: repo, jwtSecret: jwtSecret, tokenTTL: tokenTTL}
}

func (s *AuthService) Register(ctx context.Context, email string, password string) (models.User, string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	log.Info().Str("email", email).Msg("register requested")
	if email == "" || password == "" {
		log.Warn().Msg("register rejected: empty credentials")
		return models.User{}, "", errors.New("email and password are required")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return models.User{}, "", err
	}
	user, err := s.repo.CreateLocalUser(ctx, email, string(hash), "user")
	if err != nil {
		log.Error().Err(err).Str("email", email).Msg("register failed on repository create")
		return models.User{}, "", err
	}
	token, err := sdkauth.Sign(s.jwtSecret, user.ID, user.Role, s.tokenTTL)
	if err != nil {
		log.Error().Err(err).Str("email", email).Msg("register failed on token sign")
		return models.User{}, "", err
	}
	log.Info().Str("user_id", user.ID).Str("email", user.Email).Msg("register completed")
	return user, token, nil
}

func (s *AuthService) Login(ctx context.Context, email string, password string) (models.User, string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	log.Info().Str("email", email).Msg("login requested")
	user, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		log.Warn().Err(err).Str("email", email).Msg("login failed: user lookup")
		return models.User{}, "", err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		log.Warn().Str("email", email).Msg("login failed: invalid credentials")
		return models.User{}, "", errors.New("invalid credentials")
	}
	token, err := sdkauth.Sign(s.jwtSecret, user.ID, user.Role, s.tokenTTL)
	if err != nil {
		log.Error().Err(err).Str("user_id", user.ID).Msg("login failed: token sign")
		return models.User{}, "", err
	}
	log.Info().Str("user_id", user.ID).Str("role", user.Role).Msg("login completed")
	return user, token, nil
}

func (s *AuthService) LoginGoogle(ctx context.Context, email string, googleSub string) (models.User, string, error) {
	log.Info().Str("email", email).Msg("google login requested")
	user, err := s.repo.UpsertGoogleUser(ctx, email, googleSub, "user")
	if err != nil {
		log.Error().Err(err).Str("email", email).Msg("google login failed on upsert")
		return models.User{}, "", err
	}
	token, err := sdkauth.Sign(s.jwtSecret, user.ID, user.Role, s.tokenTTL)
	if err != nil {
		log.Error().Err(err).Str("user_id", user.ID).Msg("google login failed on token sign")
		return models.User{}, "", err
	}
	log.Info().Str("user_id", user.ID).Msg("google login completed")
	return user, token, nil
}

func (s *AuthService) LoginDirectAdmin(ctx context.Context, username string, password string, ipAddress string) (models.User, string, error) {
	log.Info().Str("username", username).Str("ip", ipAddress).Msg("direct admin login requested")
	success := username == "admin" && password == "admin123"
	_ = s.repo.LogAdminAccess(ctx, username, success, ipAddress)
	if !success {
		log.Warn().Str("username", username).Str("ip", ipAddress).Msg("direct admin login rejected")
		return models.User{}, "", errors.New("invalid admin credentials")
	}
	adminUser, err := s.repo.GetByEmail(ctx, "admin@local")
	if err != nil {
		adminUser, err = s.repo.CreateLocalUser(ctx, "admin@local", "", "admin")
		if err != nil {
			log.Error().Err(err).Msg("direct admin bootstrap failed")
			return models.User{}, "", err
		}
	}
	token, err := sdkauth.Sign(s.jwtSecret, adminUser.ID, "admin", s.tokenTTL)
	if err != nil {
		log.Error().Err(err).Str("user_id", adminUser.ID).Msg("direct admin token sign failed")
		return models.User{}, "", err
	}
	adminUser.Role = "admin"
	log.Info().Str("user_id", adminUser.ID).Msg("direct admin login completed")
	return adminUser, token, nil
}

func (s *AuthService) UpsertSettings(ctx context.Context, userID string, settings models.UserSettings) (models.UserSettings, error) {
	log.Debug().Str("user_id", userID).Msg("upserting user settings")
	settings.UserID = userID
	if settings.Language == "" {
		settings.Language = "ru"
	}
	if settings.Theme == "" {
		settings.Theme = "system"
	}
	if settings.Timezone == "" {
		settings.Timezone = "UTC"
	}
	return s.repo.UpsertSettings(ctx, settings)
}

func (s *AuthService) GetSettings(ctx context.Context, userID string) (models.UserSettings, error) {
	return s.repo.GetSettings(ctx, userID)
}

func (s *AuthService) ListSSHKeys(ctx context.Context, userID string) ([]models.SSHKey, error) {
	log.Debug().Str("user_id", userID).Msg("listing ssh keys")
	return s.repo.ListSSHKeys(ctx, userID)
}

func (s *AuthService) CreateSSHKey(ctx context.Context, userID string, key models.SSHKey) (models.SSHKey, error) {
	log.Info().Str("user_id", userID).Str("key_name", key.Name).Msg("creating ssh key")
	if key.Name == "" || key.PublicKey == "" {
		log.Warn().Str("user_id", userID).Msg("ssh key create rejected: missing fields")
		return models.SSHKey{}, errors.New("name and public_key are required")
	}
	key.UserID = userID
	return s.repo.CreateSSHKey(ctx, key)
}

func (s *AuthService) DeleteSSHKey(ctx context.Context, userID string, keyID string) error {
	log.Info().Str("user_id", userID).Str("key_id", keyID).Msg("deleting ssh key")
	return s.repo.DeleteSSHKey(ctx, userID, keyID)
}
