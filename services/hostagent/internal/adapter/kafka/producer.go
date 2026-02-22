package kafka

import (
	"context"
	"encoding/json"

	"github.com/IBM/sarama"
	"github.com/MidasWR/ShareMTC/services/hostagent/internal/models"
)

type Producer struct {
	sync sarama.SyncProducer
}

func New(brokers []string) (*Producer, error) {
	cfg := sarama.NewConfig()
	cfg.Producer.Return.Successes = true
	cfg.Producer.RequiredAcks = sarama.WaitForAll
	cfg.Producer.Retry.Max = 3
	p, err := sarama.NewSyncProducer(brokers, cfg)
	if err != nil {
		return nil, err
	}
	return &Producer{sync: p}, nil
}

func (p *Producer) Close() error {
	return p.sync.Close()
}

func (p *Producer) PublishMetric(ctx context.Context, topic string, metric models.HostMetric) error {
	_ = ctx
	payload, err := json.Marshal(metric)
	if err != nil {
		return err
	}
	msg := &sarama.ProducerMessage{
		Topic: topic,
		Key:   sarama.StringEncoder(metric.ProviderID),
		Value: sarama.ByteEncoder(payload),
	}
	_, _, err = p.sync.SendMessage(msg)
	return err
}
