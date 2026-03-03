package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/MidasWR/ShareMTC/services/hostagent/config"
	"github.com/MidasWR/ShareMTC/services/hostagent/internal/adapter/httpclient"
	"github.com/MidasWR/ShareMTC/services/hostagent/internal/adapter/kafka"
	"github.com/MidasWR/ShareMTC/services/hostagent/internal/models"
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
	logger.Info().
		Str("provider_id", cfg.ProviderID).
		Dur("interval", cfg.Interval).
		Str("resource_api_url", cfg.ResourceAPIURL).
		Strs("kafka_brokers", cfg.KafkaBrokers).
		Str("kafka_topic", cfg.KafkaTopic).
		Msg("hostagent configuration loaded")

	var producer *kafka.Producer
	if len(cfg.KafkaBrokers) > 0 {
		producer, err = kafka.New(cfg.KafkaBrokers)
		if err != nil {
			logger.Fatal().Err(err).Msg("kafka connect failed")
		}
		defer producer.Close()
		logger.Info().Msg("kafka producer initialized")
	}
	if producer == nil && cfg.ResourceAPIURL == "" {
		logger.Fatal().Err(errors.New("no output configured")).Msg("set KAFKA_BROKERS or RESOURCE_API_URL")
	}

	ticker := time.NewTicker(cfg.Interval)
	defer ticker.Stop()

	state := service.NetState{}
	logger.Info().
		Strs("brokers", cfg.KafkaBrokers).
		Str("topic", cfg.KafkaTopic).
		Str("resource_api_url", cfg.ResourceAPIURL).
		Msg("hostagent started")
	for range ticker.C {
		logger.Debug().Msg("hostagent collection tick")
		metric, nextState, err := service.Collect(cfg.ProviderID, state)
		if err != nil {
			logger.Error().Err(err).Msg("collect metric failed")
			continue
		}
		state = nextState
		logger.Debug().
			Int64("last_net_bytes", state.LastBytes).
			Time("last_at", state.LastAt).
			Msg("network state updated")
		if producer != nil {
			if err := producer.PublishMetric(context.Background(), cfg.KafkaTopic, metric); err != nil {
				logger.Error().Err(err).Msg("publish metric failed")
			}
			for _, evt := range metricEvents(metric) {
				if err := producer.PublishEvent(context.Background(), cfg.KafkaTopic, evt); err != nil {
					logger.Error().Err(err).Str("event_type", evt.EventType).Msg("publish telemetry event failed")
				}
			}
			for _, evt := range healthLogEvents(metric) {
				if err := producer.PublishEvent(context.Background(), cfg.KafkaTopic, evt); err != nil {
					logger.Error().Err(err).Str("event_type", evt.EventType).Msg("publish log event failed")
				}
			}
		}
		if cfg.ResourceAPIURL != "" {
			if err := httpclient.SendHeartbeat(context.Background(), cfg.ResourceAPIURL, cfg.AgentToken, metric); err != nil {
				logger.Error().Err(err).Msg("heartbeat http failed")
			}
			logLevel := "info"
			if metric.GPUFreeUnits == 0 {
				logLevel = "warning"
			}
			logMessage := "heartbeat delivered"
			if metric.NetworkMbps == 0 {
				logLevel = "warning"
				logMessage = "network throughput is zero on heartbeat"
			}
			if err := httpclient.SendAgentLog(context.Background(), cfg.ResourceAPIURL, cfg.AgentToken, serviceLog(metric.ProviderID, logLevel, logMessage)); err != nil {
				logger.Error().Err(err).Msg("agent log http failed")
			}
		}
		logger.Info().
			Str("provider_id", metric.ProviderID).
			Int("cpu_total_cores", metric.CPUTotalCores).
			Int("cpu_free_cores", metric.CPUFreeCores).
			Int("ram_total_mb", metric.RAMTotalMB).
			Int("ram_free_mb", metric.RAMFreeMB).
			Int("gpu_free_units", metric.GPUFreeUnits).
			Int("gpu_total_units", metric.GPUTotalUnits).
			Int("gpu_memory_total_mb", metric.GPUMemoryTotalMB).
			Int("gpu_memory_used_mb", metric.GPUMemoryUsedMB).
			Int("disk_total_mb", metric.DiskTotalMB).
			Int("disk_free_mb", metric.DiskFreeMB).
			Int("network_mbps", metric.NetworkMbps).
			Float64("load_avg_1m", metric.LoadAvg1m).
			Int64("uptime_seconds", metric.UptimeSeconds).
			Msg("metric sent")
	}
}

func serviceLog(providerID string, level string, message string) models.AgentLog {
	return models.AgentLog{
		ProviderID: providerID,
		Level:      level,
		Message:    message,
		Source:     "hostagent",
		CreatedAt:  time.Now().UTC(),
	}
}

func metricEvents(metric models.HostMetric) []kafka.Event {
	now := metric.HeartbeatAt
	if now.IsZero() {
		now = time.Now().UTC()
	}
	makeMetric := func(metricType string, value float64) kafka.Event {
		return kafka.Event{
			EventType:  "metric",
			ProviderID: metric.ProviderID,
			ResourceID: metric.ProviderID,
			OccurredAt: now,
			Payload: map[string]interface{}{
				"resource_type": "host",
				"metric_type":   metricType,
				"value":         value,
			},
		}
	}
	return []kafka.Event{
		makeMetric("host_cpu_total_cores", float64(metric.CPUTotalCores)),
		makeMetric("host_cpu_free_cores", float64(metric.CPUFreeCores)),
		makeMetric("host_ram_total_mb", float64(metric.RAMTotalMB)),
		makeMetric("host_ram_free_mb", float64(metric.RAMFreeMB)),
		makeMetric("host_gpu_total_units", float64(metric.GPUTotalUnits)),
		makeMetric("host_gpu_free_units", float64(metric.GPUFreeUnits)),
		makeMetric("host_gpu_memory_total_mb", float64(metric.GPUMemoryTotalMB)),
		makeMetric("host_gpu_memory_used_mb", float64(metric.GPUMemoryUsedMB)),
		makeMetric("host_disk_total_mb", float64(metric.DiskTotalMB)),
		makeMetric("host_disk_free_mb", float64(metric.DiskFreeMB)),
		makeMetric("host_network_mbps", float64(metric.NetworkMbps)),
		makeMetric("host_load_avg_1m", metric.LoadAvg1m),
		makeMetric("host_uptime_seconds", float64(metric.UptimeSeconds)),
	}
}

func healthLogEvents(metric models.HostMetric) []kafka.Event {
	events := make([]kafka.Event, 0, 2)
	now := metric.HeartbeatAt
	if now.IsZero() {
		now = time.Now().UTC()
	}
	diskFreeRatio := ratio(metric.DiskFreeMB, metric.DiskTotalMB)
	ramFreeRatio := ratio(metric.RAMFreeMB, metric.RAMTotalMB)
	if diskFreeRatio < 0.1 {
		events = append(events, kafka.Event{
			EventType:  "agent_log",
			ProviderID: metric.ProviderID,
			ResourceID: metric.ProviderID,
			OccurredAt: now,
			Payload: map[string]interface{}{
				"level":   "warning",
				"source":  "hostagent",
				"message": fmt.Sprintf("low disk headroom: %.2f%% free", diskFreeRatio*100),
			},
		})
	}
	if ramFreeRatio < 0.1 {
		events = append(events, kafka.Event{
			EventType:  "agent_log",
			ProviderID: metric.ProviderID,
			ResourceID: metric.ProviderID,
			OccurredAt: now,
			Payload: map[string]interface{}{
				"level":   "warning",
				"source":  "hostagent",
				"message": fmt.Sprintf("low RAM headroom: %.2f%% free", ramFreeRatio*100),
			},
		})
	}
	return events
}

func ratio(part int, total int) float64 {
	if total <= 0 || part <= 0 {
		return 0
	}
	return float64(part) / float64(total)
}
