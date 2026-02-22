package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	httpadapter "github.com/MidasWR/ShareMTC/services/authservice/internal/adapter/http"
	"github.com/MidasWR/ShareMTC/services/authservice/internal/adapter/storage"
	"github.com/MidasWR/ShareMTC/services/authservice/internal/service"
	"github.com/MidasWR/ShareMTC/services/authservice/config"
	"github.com/MidasWR/ShareMTC/services/sdk/db"
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
		panic(err)
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.PostgresDSN)
	if err != nil {
		logger.Fatal().Err(err).Msg("postgres connect failed")
	}
	defer pool.Close()

	repo := storage.NewPostgresRepo(pool)
	if err := repo.Migrate(ctx); err != nil {
		logger.Fatal().Err(err).Msg("migration failed")
	}

	svc := service.New(repo, cfg.JWTSecret, time.Duration(cfg.TokenTTLMinutes)*time.Minute)
	handler := httpadapter.NewHandler(svc, logger, cfg.GoogleClientID, cfg.GoogleSecret, cfg.GoogleRedirect)

	r := chi.NewRouter()
	r.Get("/healthz", handler.Health)
	r.Route("/v1/auth", func(api chi.Router) {
		api.Post("/register", handler.Register)
		api.Post("/login", handler.Login)
		api.Get("/google/start", handler.GoogleStart)
		api.Get("/google/callback", handler.GoogleCallback)
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
