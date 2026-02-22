package main

import (
	"context"
	"time"

	"github.com/MidasWR/ShareMTC/services/hostagent/config"
	"github.com/MidasWR/ShareMTC/services/hostagent/internal/adapter/kafka"
	"github.com/MidasWR/ShareMTC/services/hostagent/internal/service"
	"github.com/MidasWR/ShareMTC/services/sdk/logging"
)

func main() {
	cfg := config.Load()
	logger, err := logging.New(logging.Config{
		ServiceName: "hostagent",
		WriterAddr:  cfg.MidasWriterAddr,
	})
	if err != nil {
		panic(err)
	}
	producer, err := kafka.New(cfg.KafkaBrokers)
	if err != nil {
		logger.Fatal().Err(err).Msg("kafka connect failed")
	}
	defer producer.Close()

	ticker := time.NewTicker(cfg.Interval)
	defer ticker.Stop()

	state := service.NetState{}
	logger.Info().Strs("brokers", cfg.KafkaBrokers).Str("topic", cfg.KafkaTopic).Msg("hostagent started")
	for range ticker.C {
		metric, nextState, err := service.Collect(cfg.ProviderID, state)
		if err != nil {
			logger.Error().Err(err).Msg("collect metric failed")
			continue
		}
		state = nextState
		if err := producer.PublishMetric(context.Background(), cfg.KafkaTopic, metric); err != nil {
			logger.Error().Err(err).Msg("publish metric failed")
			continue
		}
		logger.Info().
			Str("provider_id", metric.ProviderID).
			Int("cpu_free_cores", metric.CPUFreeCores).
			Int("ram_free_mb", metric.RAMFreeMB).
			Int("gpu_free_units", metric.GPUFreeUnits).
			Int("network_mbps", metric.NetworkMbps).
			Msg("metric sent")
	}
}
