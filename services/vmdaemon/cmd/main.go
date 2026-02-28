package main

import (
	"bufio"
	"context"
	"encoding/json"
	"io"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/IBM/sarama"
)

type Config struct {
	KafkaBrokers []string
	KafkaTopic   string
	ProviderID   string
	ResourceID   string
	ResourceType string
	Interval     time.Duration
	AuditLogPath string
}

type Event struct {
	EventType  string                 `json:"event_type"`
	ProviderID string                 `json:"provider_id"`
	ResourceID string                 `json:"resource_id"`
	OccurredAt time.Time              `json:"occurred_at"`
	Payload    map[string]interface{} `json:"payload"`
}

func main() {
	cfg := loadConfig()
	producer, err := newProducer(cfg.KafkaBrokers)
	if err != nil {
		panic(err)
	}
	defer producer.Close()
	ctx := context.Background()

	lastAuditOffset := int64(0)
	ticker := time.NewTicker(cfg.Interval)
	defer ticker.Stop()

	for {
		now := time.Now().UTC()
		_ = publishEvent(ctx, producer, cfg.KafkaTopic, cfg.ResourceID, Event{
			EventType:  "health_check",
			ProviderID: cfg.ProviderID,
			ResourceID: cfg.ResourceID,
			OccurredAt: now,
			Payload: map[string]interface{}{
				"resource_type": cfg.ResourceType,
				"check_type":    "daemon_heartbeat",
				"status":        "ok",
				"details":       "vmdaemon heartbeat ok",
			},
		})

		loadAvg := readLoadAverage()
		memUsedPercent := readMemUsedPercent()
		_ = publishEvent(ctx, producer, cfg.KafkaTopic, cfg.ResourceID, Event{
			EventType:  "metric",
			ProviderID: cfg.ProviderID,
			ResourceID: cfg.ResourceID,
			OccurredAt: now,
			Payload: map[string]interface{}{
				"resource_type": cfg.ResourceType,
				"metric_type":   "load_1m",
				"value":         loadAvg,
			},
		})
		_ = publishEvent(ctx, producer, cfg.KafkaTopic, cfg.ResourceID, Event{
			EventType:  "metric",
			ProviderID: cfg.ProviderID,
			ResourceID: cfg.ResourceID,
			OccurredAt: now,
			Payload: map[string]interface{}{
				"resource_type": cfg.ResourceType,
				"metric_type":   "memory_used_percent",
				"value":         memUsedPercent,
			},
		})
		_ = publishEvent(ctx, producer, cfg.KafkaTopic, cfg.ResourceID, Event{
			EventType:  "agent_log",
			ProviderID: cfg.ProviderID,
			ResourceID: cfg.ResourceID,
			OccurredAt: now,
			Payload: map[string]interface{}{
				"level":   "info",
				"message": "vmdaemon heartbeat delivered",
				"source":  "vmdaemon",
			},
		})

		lines, nextOffset, err := readAuditDelta(cfg.AuditLogPath, lastAuditOffset)
		if err == nil {
			lastAuditOffset = nextOffset
			for _, line := range lines {
				if !looksLikeRootExec(line) {
					continue
				}
				command := extractAuditCommand(line)
				if command == "" {
					continue
				}
				_ = publishEvent(ctx, producer, cfg.KafkaTopic, cfg.ResourceID, Event{
					EventType:  "root_input_log",
					ProviderID: cfg.ProviderID,
					ResourceID: cfg.ResourceID,
					OccurredAt: now,
					Payload: map[string]interface{}{
						"username": "root",
						"tty":      extractAuditTTY(line),
						"command":  command,
						"source":   "auditd",
					},
				})
			}
		}
		<-ticker.C
	}
}

func loadConfig() Config {
	intervalSeconds := 15
	if raw := strings.TrimSpace(os.Getenv("VMDAEMON_INTERVAL_SECONDS")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			intervalSeconds = parsed
		}
	}
	return Config{
		KafkaBrokers: splitCSV(env("KAFKA_BROKERS", "")),
		KafkaTopic:   env("KAFKA_TOPIC", "vmdaemon.events"),
		ProviderID:   env("RESOURCE_PROVIDER_ID", ""),
		ResourceID:   env("RESOURCE_ID", ""),
		ResourceType: env("RESOURCE_TYPE", "vm"),
		Interval:     time.Duration(intervalSeconds) * time.Second,
		AuditLogPath: env("VMDAEMON_AUDIT_LOG_PATH", "/var/log/audit/audit.log"),
	}
}

func publishEvent(ctx context.Context, producer sarama.SyncProducer, topic string, key string, event Event) error {
	_ = ctx
	raw, err := json.Marshal(event)
	if err != nil {
		return err
	}
	msg := &sarama.ProducerMessage{
		Topic: topic,
		Key:   sarama.StringEncoder(key),
		Value: sarama.ByteEncoder(raw),
	}
	_, _, err = producer.SendMessage(msg)
	return err
}

func readLoadAverage() float64 {
	raw, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return 0
	}
	fields := strings.Fields(string(raw))
	if len(fields) == 0 {
		return 0
	}
	value, err := strconv.ParseFloat(fields[0], 64)
	if err != nil {
		return 0
	}
	return value
}

func readMemUsedPercent() float64 {
	raw, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return 0
	}
	total := float64(0)
	available := float64(0)
	for _, line := range strings.Split(string(raw), "\n") {
		if strings.HasPrefix(line, "MemTotal:") {
			total = parseKBLine(line)
		}
		if strings.HasPrefix(line, "MemAvailable:") {
			available = parseKBLine(line)
		}
	}
	if total <= 0 {
		return 0
	}
	used := total - available
	if used < 0 {
		used = 0
	}
	return (used / total) * 100
}

func parseKBLine(line string) float64 {
	fields := strings.Fields(line)
	if len(fields) < 2 {
		return 0
	}
	value, err := strconv.ParseFloat(fields[1], 64)
	if err != nil {
		return 0
	}
	return value
}

func readAuditDelta(path string, offset int64) ([]string, int64, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, offset, err
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return nil, offset, err
	}
	if offset > info.Size() {
		offset = 0
	}
	if _, err := file.Seek(offset, io.SeekStart); err != nil {
		return nil, offset, err
	}
	scanner := bufio.NewScanner(file)
	lines := make([]string, 0)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}
	if err := scanner.Err(); err != nil {
		return nil, offset, err
	}
	nextOffset, _ := file.Seek(0, io.SeekCurrent)
	return lines, nextOffset, nil
}

func looksLikeRootExec(line string) bool {
	return strings.Contains(line, "type=EXECVE") && strings.Contains(line, "uid=0")
}

func extractAuditCommand(line string) string {
	idx := strings.Index(line, "a0=")
	if idx == -1 {
		return ""
	}
	return strings.TrimSpace(line[idx:])
}

func extractAuditTTY(line string) string {
	parts := strings.Split(line, " ")
	for _, part := range parts {
		if strings.HasPrefix(part, "tty=") {
			return strings.TrimPrefix(part, "tty=")
		}
	}
	return ""
}

func env(name, fallback string) string {
	value := strings.TrimSpace(os.Getenv(name))
	if value == "" {
		return fallback
	}
	return value
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

func newProducer(brokers []string) (sarama.SyncProducer, error) {
	if len(brokers) == 0 {
		return nil, sarama.ErrOutOfBrokers
	}
	cfg := sarama.NewConfig()
	cfg.Producer.Return.Successes = true
	cfg.Producer.RequiredAcks = sarama.WaitForAll
	cfg.Producer.Retry.Max = 3
	return sarama.NewSyncProducer(brokers, cfg)
}
