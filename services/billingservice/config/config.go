package config

import "os"

type Config struct {
	Port            string
	PostgresDSN     string
	MidasWriterAddr string
}

func Load() Config {
	return Config{
		Port:            env("PORT", "8084"),
		PostgresDSN:     env("POSTGRES_DSN", "postgres://postgres:postgres@localhost:5432/host?sslmode=disable"),
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
