package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port             string
	PostgresDSN      string
	JWTSecret        string
	GoogleClientID   string
	GoogleSecret     string
	GoogleRedirect   string
	MidasWriterAddr  string
	MidasWriterTLS   bool
	TokenTTLMinutes  int
}

func Load() Config {
	return Config{
		Port:            env("PORT", "8081"),
		PostgresDSN:     env("POSTGRES_DSN", "postgres://postgres:postgres@localhost:5432/host?sslmode=disable"),
		JWTSecret:       env("JWT_SECRET", "change-me-in-production"),
		GoogleClientID:  os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleSecret:    os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirect:  env("GOOGLE_REDIRECT_URL", "http://localhost:8081/v1/auth/google/callback"),
		MidasWriterAddr: os.Getenv("MIDAS_WRITER_ADDR"),
		MidasWriterTLS:  envBool("MIDAS_WRITER_TLS", false),
		TokenTTLMinutes: envInt("TOKEN_TTL_MINUTES", 1440),
	}
}

func env(name string, fallback string) string {
	v := os.Getenv(name)
	if v == "" {
		return fallback
	}
	return v
}

func envBool(name string, fallback bool) bool {
	v := os.Getenv(name)
	if v == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return parsed
}

func envInt(name string, fallback int) int {
	v := os.Getenv(name)
	if v == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return parsed
}
