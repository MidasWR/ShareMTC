package config

import (
	"os"
	"strconv"

	sdkconfig "github.com/MidasWR/ShareMTC/services/sdk/config"
)

type Config struct {
	Port            string
	PostgresDSN     string
	MidasWriterAddr string
	JWTSecret       string
	GitHubRepo      string
	ReleaseTag      string
	AgentResourceURL string
	AgentKafkaBrokers string
	AgentImageRepo    string
	EnableSyntheticCatalogSeed bool
}

func Load() Config {
	return Config{
		Port:            env("PORT", "8082"),
		PostgresDSN:     postgresDSN(),
		MidasWriterAddr: os.Getenv("MIDAS_WRITER_ADDR"),
		JWTSecret:       env("JWT_SECRET", "change-me-in-production"),
		GitHubRepo:      env("GITHUB_REPO", "MidasWR/ShareMTC"),
		ReleaseTag:      env("RELEASE_TAG", "latest"),
		AgentResourceURL: env("AGENT_RESOURCE_API_URL", ""),
		AgentKafkaBrokers: env("AGENT_KAFKA_BROKERS", ""),
		AgentImageRepo:    env("AGENT_IMAGE_REPO", "midaswr/host-hostagent"),
		EnableSyntheticCatalogSeed: envBool("ENABLE_SYNTHETIC_CATALOG_SEED", false),
	}
}

func env(name, fallback string) string {
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
