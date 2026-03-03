package httpclient

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/MidasWR/ShareMTC/services/hostagent/internal/models"
)

func SendHeartbeat(ctx context.Context, baseURL string, token string, metric models.HostMetric) error {
	url := strings.TrimRight(baseURL, "/") + "/v1/resources/heartbeat"
	payload, err := json.Marshal(metric)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return &httpStatusError{Code: resp.StatusCode}
	}
	return nil
}

func SendAgentLog(ctx context.Context, baseURL string, token string, log models.AgentLog) error {
	url := strings.TrimRight(baseURL, "/") + "/v1/resources/agent-logs"
	payload, err := json.Marshal(log)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return &httpStatusError{Code: resp.StatusCode}
	}
	return nil
}

func PollAgentCommand(ctx context.Context, baseURL string, token string, providerID string) (models.AgentCommand, error) {
	url := strings.TrimRight(baseURL, "/") + "/v1/resources/agent/commands/poll"
	payload, err := json.Marshal(map[string]string{
		"provider_id": providerID,
	})
	if err != nil {
		return models.AgentCommand{}, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return models.AgentCommand{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return models.AgentCommand{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return models.AgentCommand{}, &httpStatusError{Code: resp.StatusCode}
	}
	var out models.AgentCommand
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return models.AgentCommand{}, err
	}
	return out, nil
}

func CompleteAgentCommand(ctx context.Context, baseURL string, token string, commandID string, providerID string, status string, resultMessage string) error {
	url := strings.TrimRight(baseURL, "/") + "/v1/resources/agent/commands/" + commandID + "/complete"
	payload, err := json.Marshal(map[string]string{
		"provider_id":    providerID,
		"status":         status,
		"result_message": resultMessage,
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return &httpStatusError{Code: resp.StatusCode}
	}
	return nil
}

type httpStatusError struct {
	Code int
}

func (e *httpStatusError) Error() string {
	return http.StatusText(e.Code)
}
