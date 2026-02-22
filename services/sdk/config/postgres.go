package config

import "fmt"

type PostgresEnv struct {
	Host     string
	Port     string
	Database string
	User     string
	Password string
	SSLMode  string
}

func BuildPostgresDSN(dsn string, env PostgresEnv) string {
	if dsn != "" {
		return dsn
	}
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		env.User,
		env.Password,
		env.Host,
		env.Port,
		env.Database,
		env.SSLMode,
	)
}
