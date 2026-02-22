package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	ProviderID      string
	KafkaBrokers    []string
	KafkaTopic      string
	ResourceAPIURL  string
	AgentToken      string
	Interval        time.Duration
	MidasWriterAddr string
}

func Load() Config {
	return Config{
		ProviderID:      env("PROVIDER_ID", "local-host"),
		KafkaBrokers:    splitCSV(env("KAFKA_BROKERS", "")),
		KafkaTopic:      env("KAFKA_TOPIC", "host.metrics"),
		ResourceAPIURL:  env("RESOURCE_API_URL", ""),
		AgentToken:      env("AGENT_TOKEN", ""),
		Interval:        time.Duration(envInt("METRICS_INTERVAL_SECONDS", 5)) * time.Second,
		MidasWriterAddr: os.Getenv("MIDAS_WRITER_ADDR"),
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

func splitCSV(raw string) []string {
	out := make([]string, 0)
	current := ""
	for _, ch := range raw {
		if ch == ',' {
			if current != "" {
				out = append(out, current)
			}
			current = ""
			continue
		}
		if ch != ' ' {
			current += string(ch)
		}
	}
	if current != "" {
		out = append(out, current)
	}
	return out
}
