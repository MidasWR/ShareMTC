package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/MidasWR/ShareMTC/services/authservice/config"
	httpadapter "github.com/MidasWR/ShareMTC/services/authservice/internal/adapter/http"
	"github.com/MidasWR/ShareMTC/services/authservice/internal/adapter/storage"
	"github.com/MidasWR/ShareMTC/services/authservice/internal/service"
	sdkauth "github.com/MidasWR/ShareMTC/services/sdk/auth"
	"github.com/MidasWR/ShareMTC/services/sdk/db"
	"github.com/MidasWR/ShareMTC/services/sdk/httpx"
	"github.com/MidasWR/ShareMTC/services/sdk/logging"
	"github.com/go-chi/chi/v5"
)

func main() {
	cfg := config.Load()
	logger, err := logging.New(logging.Config{
		ServiceName: "authservice",
		WriterAddr:  cfg.MidasWriterAddr,
		WriterTLS:   cfg.MidasWriterTLS,
	})
	if err != nil {
		_, _ = os.Stdout.WriteString("authservice logger init failed: " + err.Error() + "\n")
		os.Exit(1)
	}
	logger.Info().
		Str("port", cfg.Port).
		Int("token_ttl_minutes", cfg.TokenTTLMinutes).
		Bool("writer_tls", cfg.MidasWriterTLS).
		Str("frontend_base_url", cfg.FrontendBaseURL).
		Msg("authservice configuration loaded")

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.PostgresDSN)
	if err != nil {
		logger.Fatal().Err(err).Msg("postgres connect failed")
	}
	defer pool.Close()

	repo := storage.NewPostgresRepo(pool)
	logger.Info().Msg("auth repository initialized")
	if err := repo.Migrate(ctx); err != nil {
		logger.Fatal().Err(err).Msg("migration failed")
	}
	logger.Info().Msg("auth database migrations applied")
	if err := repo.EnsureLocalUser(ctx, "admin@local", "admin"); err != nil {
		logger.Fatal().Err(err).Msg("failed to ensure default admin user")
	}
	logger.Info().Msg("default admin user ensured")

	svc := service.New(repo, cfg.JWTSecret, time.Duration(cfg.TokenTTLMinutes)*time.Minute)
	logger.Info().Msg("auth service initialized")
	handler := httpadapter.NewHandler(svc, logger, cfg.GoogleClientID, cfg.GoogleSecret, cfg.GoogleRedirect, cfg.FrontendBaseURL, cfg.JWTSecret)
	logger.Info().Str("google_redirect", cfg.GoogleRedirect).Msg("auth http handler initialized")

	r := chi.NewRouter()
	r.Use(httpx.RequestLogger(logger))
	r.Get("/healthz", handler.Health)
	r.Route("/v1/auth", func(api chi.Router) {
		api.Post("/register", handler.Register)
		api.Post("/login", handler.Login)
		api.Post("/admin/direct", handler.DirectAdminLogin)
		api.Get("/google/start", handler.GoogleStart)
		api.Get("/google/callback", handler.GoogleCallback)
		api.Group(func(secure chi.Router) {
			secure.Use(sdkauth.RequireAuth(cfg.JWTSecret))
			secure.Get("/settings", handler.GetSettings)
			secure.Put("/settings", handler.UpsertSettings)
			secure.Get("/ssh-keys", handler.ListSSHKeys)
			secure.Post("/ssh-keys", handler.CreateSSHKey)
			secure.Delete("/ssh-keys/{keyID}", handler.DeleteSSHKey)
		})
	})

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info().Str("addr", server.Addr).Msg("authservice started")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal().Err(err).Msg("server stopped")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error().Err(err).Msg("shutdown error")
	}
	logger.Info().Msg("authservice stopped")
}
