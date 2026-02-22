package service

import (
	"context"
	"testing"
	"time"

	"github.com/MidasWR/ShareMTC/services/authservice/internal/models"
)

type authRepoStub struct {
	users map[string]models.User
}

func (r *authRepoStub) CreateLocalUser(_ context.Context, email string, passwordHash string, role string) (models.User, error) {
	user := models.User{ID: "u1", Email: email, PasswordHash: passwordHash, Role: role, CreatedAt: time.Now().UTC()}
	r.users[email] = user
	return user, nil
}

func (r *authRepoStub) GetByEmail(_ context.Context, email string) (models.User, error) {
	return r.users[email], nil
}

func (r *authRepoStub) UpsertGoogleUser(_ context.Context, email string, googleSub string, role string) (models.User, error) {
	user := models.User{ID: "u2", Email: email, GoogleSub: googleSub, Role: role, CreatedAt: time.Now().UTC()}
	r.users[email] = user
	return user, nil
}

func TestRegisterAndLogin(t *testing.T) {
	repo := &authRepoStub{users: make(map[string]models.User)}
	svc := New(repo, "secret", time.Hour)

	_, token, err := svc.Register(context.Background(), "user@mail.com", "pass123")
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}
	if token == "" {
		t.Fatal("token must not be empty")
	}

	_, token, err = svc.Login(context.Background(), "user@mail.com", "pass123")
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}
	if token == "" {
		t.Fatal("token must not be empty")
	}
}
