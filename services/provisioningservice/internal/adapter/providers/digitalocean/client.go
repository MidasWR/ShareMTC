package digitalocean

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
	token      string
	httpClient *http.Client
}

type CreateVMRequest struct {
	Name              string
	Region            string
	Size              string
	Image             string
	SSHKeyFingerprints []string
	UserData          string
}

type CreateVMResult struct {
	ID       string
	PublicIP string
}

func NewClient(baseURL string, token string, timeout time.Duration) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		token:   strings.TrimSpace(token),
		httpClient: &http.Client{
			Timeout: timeout,
		},
	}
}

func (c *Client) CreateVM(ctx context.Context, req CreateVMRequest) (CreateVMResult, error) {
	if c.token == "" {
		return CreateVMResult{}, errors.New("digitalocean token is empty")
	}
	body := map[string]any{
		"name":      req.Name,
		"region":    req.Region,
		"size":      req.Size,
		"image":     req.Image,
		"ssh_keys":  req.SSHKeyFingerprints,
		"user_data": req.UserData,
		"tags":      []string{"sharemtc", "ephemeral"},
	}
	responseBody, err := c.doJSON(ctx, http.MethodPost, "/droplets", body)
	if err != nil {
		return CreateVMResult{}, err
	}
	var response struct {
		Droplet struct {
			ID int64 `json:"id"`
		} `json:"droplet"`
	}
	if err := json.Unmarshal(responseBody, &response); err != nil {
		return CreateVMResult{}, err
	}
	if response.Droplet.ID == 0 {
		return CreateVMResult{}, errors.New("digitalocean returned empty droplet id")
	}
	return CreateVMResult{
		ID: fmt.Sprintf("%d", response.Droplet.ID),
	}, nil
}

func (c *Client) DeleteVM(ctx context.Context, externalID string) error {
	if c.token == "" {
		return errors.New("digitalocean token is empty")
	}
	_, err := c.doJSON(ctx, http.MethodDelete, "/droplets/"+externalID, nil)
	return err
}

func (c *Client) doJSON(ctx context.Context, method string, path string, payload any) ([]byte, error) {
	var body io.Reader
	if payload != nil {
		raw, err := json.Marshal(payload)
		if err != nil {
			return nil, err
		}
		body = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
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
		return nil, fmt.Errorf("digitalocean api %d: %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	return raw, nil
}
