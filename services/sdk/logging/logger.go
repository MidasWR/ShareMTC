package logging

import (
	"io"
	"os"

	midaslog "github.com/MidasWR/mc-go-writer/log"
	"github.com/rs/zerolog"
)

type Config struct {
	ServiceName string
	WriterAddr  string
	WriterTLS   bool
}

func New(cfg Config) (zerolog.Logger, error) {
	if cfg.WriterAddr == "" {
		logger := zerolog.New(zerolog.ConsoleWriter{Out: os.Stdout}).With().Timestamp().Str("service", cfg.ServiceName).Logger()
		return logger, nil
	}

	writer, err := midaslog.InitWriter(cfg.WriterAddr, cfg.WriterTLS)
	if err != nil {
		return zerolog.Logger{}, err
	}

	multi := io.MultiWriter(os.Stdout, &writer)
	logger := zerolog.New(multi).With().Timestamp().Str("service", cfg.ServiceName).Logger()
	return logger, nil
}
