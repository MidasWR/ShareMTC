package config

import (
	"os"
	"strconv"
	"time"

	sdkconfig "github.com/MidasWR/ShareMTC/services/sdk/config"
)

type Config struct {
	Port            string
	PostgresDSN     string
	MidasWriterAddr string
	JWTSecret       string
	HeartbeatMaxAge time.Duration
}

func Load() Config {
	return Config{
		Port:            env("PORT", "8083"),
		PostgresDSN:     postgresDSN(),
		MidasWriterAddr: os.Getenv("MIDAS_WRITER_ADDR"),
		JWTSecret:       env("JWT_SECRET", "change-me-in-production"),
		HeartbeatMaxAge: time.Duration(envInt("HEARTBEAT_MAX_AGE_SECONDS", 30)) * time.Second,
	}
}

func env(name, fallback string) string {
	v := os.Getenv(name)
	if v == "" {
		return fallback
	}
	return v
}

func envInt(name string, fallback int) int {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func postgresDSN() string {
	return sdkconfig.BuildPostgresDSN(os.Getenv("POSTGRES_DSN"), sdkconfig.PostgresEnv{
		Host:     env("PGHOST", "localhost"),
		Port:     env("PGPORT", "5432"),
		Database: env("PGDATABASE", "host"),
		User:     env("PGUSER", "postgres"),
		Password: env("PGPASSWORD", "postgres"),
		SSLMode:  env("PGSSLMODE", "require"),
	})
}
