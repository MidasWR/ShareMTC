package config

import (
	"os"
	"strconv"
	"strings"
	"time"

	sdkconfig "github.com/MidasWR/ShareMTC/services/sdk/config"
)

type Config struct {
	Port            string
	PostgresDSN     string
	MidasWriterAddr string
	JWTSecret       string
	HeartbeatMaxAge time.Duration
	ProvisioningURL string
	ProvisioningServiceToken string
	ProvisioningHTTPTimeout time.Duration
	CreateRateLimitRPM int
	VMTTLMinutes int
	VMDaemonDownloadURL string
	KafkaBrokers []string
	VMDaemonKafkaTopic string
	VMDaemonKafkaGroup string
}

func Load() Config {
	return Config{
		Port:            env("PORT", "8083"),
		PostgresDSN:     postgresDSN(),
		MidasWriterAddr: os.Getenv("MIDAS_WRITER_ADDR"),
		JWTSecret:       env("JWT_SECRET", "change-me-in-production"),
		HeartbeatMaxAge: time.Duration(envInt("HEARTBEAT_MAX_AGE_SECONDS", 30)) * time.Second,
		ProvisioningURL: env("PROVISIONING_BASE_URL", "http://provisioningservice:8085"),
		ProvisioningServiceToken: env("PROVISIONING_SERVICE_TOKEN", "change-me-in-production"),
		ProvisioningHTTPTimeout: time.Duration(envInt("PROVISIONING_HTTP_TIMEOUT_SECONDS", 25)) * time.Second,
		CreateRateLimitRPM: envInt("CREATE_RATE_LIMIT_RPM", 5),
		VMTTLMinutes: envInt("VM_TTL_MINUTES", 5),
		VMDaemonDownloadURL: env("VMDAEMON_DOWNLOAD_URL", "https://github.com/MidasWR/ShareMTC/releases/latest/download/sharemtc-vmdaemon"),
		KafkaBrokers: splitCSV(env("KAFKA_BROKERS", "")),
		VMDaemonKafkaTopic: env("VMDAEMON_KAFKA_TOPIC", "vmdaemon.events"),
		VMDaemonKafkaGroup: env("VMDAEMON_KAFKA_GROUP", "resourceservice-vmdaemon"),
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

func splitCSV(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}
