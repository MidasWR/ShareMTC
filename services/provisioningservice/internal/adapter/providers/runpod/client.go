package runpod

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

type CreatePodRequest struct {
	Name      string
	ImageName string
	GPUTypeID string
	GPUCount  int
	CPUCount  int
	MemoryGB  int
}

type CreatePodResult struct {
	ID string
}

func NewClient(baseURL string, apiKey string, timeout time.Duration) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  strings.TrimSpace(apiKey),
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c *Client) CreatePod(ctx context.Context, req CreatePodRequest) (CreatePodResult, error) {
	if c.apiKey == "" {
		return CreatePodResult{}, errors.New("runpod api key is empty")
	}
	query := fmt.Sprintf(
		`mutation { podFindAndDeployOnDemand(input: { name: %q, imageName: %q, gpuTypeId: %q, gpuCount: %d, containerDiskInGb: 20, volumeInGb: 20, minVcpuCount: %d, minMemoryInGb: %d }) { id } }`,
		req.Name, req.ImageName, req.GPUTypeID, req.GPUCount, req.CPUCount, req.MemoryGB,
	)
	responseBody, err := c.callGraphQL(ctx, query)
	if err != nil {
		return CreatePodResult{}, err
	}
	var response struct {
		Data struct {
			Pod struct {
				ID string `json:"id"`
			} `json:"podFindAndDeployOnDemand"`
		} `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := json.Unmarshal(responseBody, &response); err != nil {
		return CreatePodResult{}, err
	}
	if len(response.Errors) > 0 {
		return CreatePodResult{}, errors.New(response.Errors[0].Message)
	}
	if response.Data.Pod.ID == "" {
		return CreatePodResult{}, errors.New("runpod returned empty pod id")
	}
	return CreatePodResult{ID: response.Data.Pod.ID}, nil
}

func (c *Client) DeletePod(ctx context.Context, podID string) error {
	if c.apiKey == "" {
		return errors.New("runpod api key is empty")
	}
	query := fmt.Sprintf(`mutation { podTerminate(input: { podId: %q }) }`, podID)
	_, err := c.callGraphQL(ctx, query)
	return err
}

func (c *Client) callGraphQL(ctx context.Context, query string) ([]byte, error) {
	payload, err := json.Marshal(map[string]string{"query": query})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return nil, fmt.Errorf("runpod api %d: %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	return raw, nil
}
