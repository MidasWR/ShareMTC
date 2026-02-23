package service

import (
	"context"
	"errors"
	"time"

	"github.com/MidasWR/ShareMTC/services/authservice/internal/models"
	sdkauth "github.com/MidasWR/ShareMTC/services/sdk/auth"
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
	return &AuthService{repo: repo, jwtSecret: jwtSecret, tokenTTL: tokenTTL}
}

func (s *AuthService) Register(ctx context.Context, email string, password string) (models.User, string, error) {
	if email == "" || password == "" {
		return models.User{}, "", errors.New("email and password are required")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return models.User{}, "", err
	}
	user, err := s.repo.CreateLocalUser(ctx, email, string(hash), "user")
	if err != nil {
		return models.User{}, "", err
	}
	token, err := sdkauth.Sign(s.jwtSecret, user.ID, user.Role, s.tokenTTL)
	if err != nil {
		return models.User{}, "", err
	}
	return user, token, nil
}

func (s *AuthService) Login(ctx context.Context, email string, password string) (models.User, string, error) {
	user, err := s.repo.GetByEmail(ctx, email)
	if err != nil {
		return models.User{}, "", err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return models.User{}, "", errors.New("invalid credentials")
	}
	token, err := sdkauth.Sign(s.jwtSecret, user.ID, user.Role, s.tokenTTL)
	if err != nil {
		return models.User{}, "", err
	}
	return user, token, nil
}

func (s *AuthService) LoginGoogle(ctx context.Context, email string, googleSub string) (models.User, string, error) {
	user, err := s.repo.UpsertGoogleUser(ctx, email, googleSub, "user")
	if err != nil {
		return models.User{}, "", err
	}
	token, err := sdkauth.Sign(s.jwtSecret, user.ID, user.Role, s.tokenTTL)
	if err != nil {
		return models.User{}, "", err
	}
	return user, token, nil
}

func (s *AuthService) LoginDirectAdmin(ctx context.Context, username string, password string, ipAddress string) (models.User, string, error) {
	success := username == "admin" && password == "admin123"
	_ = s.repo.LogAdminAccess(ctx, username, success, ipAddress)
	if !success {
		return models.User{}, "", errors.New("invalid admin credentials")
	}
	adminUser, err := s.repo.GetByEmail(ctx, "admin@local")
	if err != nil {
		adminUser, err = s.repo.CreateLocalUser(ctx, "admin@local", "", "admin")
		if err != nil {
			return models.User{}, "", err
		}
	}
	token, err := sdkauth.Sign(s.jwtSecret, adminUser.ID, "admin", s.tokenTTL)
	if err != nil {
		return models.User{}, "", err
	}
	adminUser.Role = "admin"
	return adminUser, token, nil
}

func (s *AuthService) UpsertSettings(ctx context.Context, userID string, settings models.UserSettings) (models.UserSettings, error) {
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
	return s.repo.ListSSHKeys(ctx, userID)
}

func (s *AuthService) CreateSSHKey(ctx context.Context, userID string, key models.SSHKey) (models.SSHKey, error) {
	if key.Name == "" || key.PublicKey == "" {
		return models.SSHKey{}, errors.New("name and public_key are required")
	}
	key.UserID = userID
	return s.repo.CreateSSHKey(ctx, key)
}

func (s *AuthService) DeleteSSHKey(ctx context.Context, userID string, keyID string) error {
	return s.repo.DeleteSSHKey(ctx, userID, keyID)
}
