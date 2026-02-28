package config

import (
	"os"
	"strconv"
	"time"

	sdkconfig "github.com/MidasWR/ShareMTC/services/sdk/config"
)

type Config struct {
	Port                 string
	PostgresDSN          string
	MidasWriterAddr      string
	ServiceToken         string
	DigitalOceanToken    string
	RunPodAPIKey         string
	DigitalOceanBaseURL  string
	RunPodBaseURL        string
	TTLWorkerInterval    time.Duration
	HTTPClientTimeout    time.Duration
	MaxDeleteRetry       int
}

func Load() Config {
	return Config{
		Port:                env("PORT", "8085"),
		PostgresDSN:         postgresDSN(),
		MidasWriterAddr:     os.Getenv("MIDAS_WRITER_ADDR"),
		ServiceToken:        env("PROVISIONING_SERVICE_TOKEN", "change-me-in-production"),
		DigitalOceanToken:   env("DIGITALOCEAN_TOKEN", ""),
		RunPodAPIKey:        env("RUNPOD_API_KEY", ""),
		DigitalOceanBaseURL: env("DIGITALOCEAN_BASE_URL", "https://api.digitalocean.com/v2"),
		RunPodBaseURL:       env("RUNPOD_BASE_URL", "https://api.runpod.io/graphql"),
		TTLWorkerInterval:   time.Duration(envInt("TTL_WORKER_INTERVAL_SECONDS", 15)) * time.Second,
		HTTPClientTimeout:   time.Duration(envInt("PROVIDER_HTTP_TIMEOUT_SECONDS", 25)) * time.Second,
		MaxDeleteRetry:      envInt("PROVISIONING_MAX_DELETE_RETRY", 6),
	}
}

func env(name, fallback string) string {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}
	return value
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
