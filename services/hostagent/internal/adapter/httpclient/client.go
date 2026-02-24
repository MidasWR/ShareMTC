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

type httpStatusError struct {
	Code int
}

func (e *httpStatusError) Error() string {
	return http.StatusText(e.Code)
}
