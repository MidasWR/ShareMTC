package kafka

import (
	"context"
	"encoding/json"
	"time"

	"github.com/IBM/sarama"
)

type Event struct {
	EventType  string                 `json:"event_type"`
	ProviderID string                 `json:"provider_id"`
	ResourceID string                 `json:"resource_id"`
	OccurredAt time.Time              `json:"occurred_at"`
	Payload    map[string]interface{} `json:"payload"`
}

type Consumer struct {
	brokers []string
	topic   string
	groupID string
	handler func(context.Context, Event) error
}

func NewConsumer(brokers []string, topic string, groupID string, handler func(context.Context, Event) error) *Consumer {
	return &Consumer{
		brokers: brokers,
		topic:   topic,
		groupID: groupID,
		handler: handler,
	}
}

func (c *Consumer) Run(ctx context.Context) error {
	config := sarama.NewConfig()
	config.Version = sarama.V2_8_0_0
	config.Consumer.Return.Errors = true
	config.Consumer.Offsets.Initial = sarama.OffsetOldest

	group, err := sarama.NewConsumerGroup(c.brokers, c.groupID, config)
	if err != nil {
		return err
	}
	defer group.Close()

	handler := &groupHandler{callback: c.handler}
	for {
		if err := group.Consume(ctx, []string{c.topic}, handler); err != nil {
			return err
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}
	}
}

type groupHandler struct {
	callback func(context.Context, Event) error
}

func (h *groupHandler) Setup(sarama.ConsumerGroupSession) error   { return nil }
func (h *groupHandler) Cleanup(sarama.ConsumerGroupSession) error { return nil }

func (h *groupHandler) ConsumeClaim(session sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	for msg := range claim.Messages() {
		var event Event
		if err := json.Unmarshal(msg.Value, &event); err == nil {
			_ = h.callback(session.Context(), event)
		}
		session.MarkMessage(msg, "")
	}
	return nil
}
