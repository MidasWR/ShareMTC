package service

import (
	"context"
	"errors"
	"time"

	sdkauth "github.com/MidasWR/ShareMTC/services/sdk/auth"
	"github.com/MidasWR/ShareMTC/services/authservice/internal/models"
	"golang.org/x/crypto/bcrypt"
)

type UserRepository interface {
	CreateLocalUser(ctx context.Context, email string, passwordHash string, role string) (models.User, error)
	GetByEmail(ctx context.Context, email string) (models.User, error)
	UpsertGoogleUser(ctx context.Context, email string, googleSub string, role string) (models.User, error)
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
