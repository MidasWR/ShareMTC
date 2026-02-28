package provisioning

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/MidasWR/ShareMTC/services/resourceservice/internal/models"
)

type Client struct {
	baseURL      string
	serviceToken string
	httpClient   *http.Client
}

type CreateVMRequest struct {
	RequestID          string         `json:"request_id"`
	TraceID            string         `json:"trace_id"`
	UserID             string         `json:"user_id"`
	ProviderID         string         `json:"provider_id"`
	Name               string         `json:"name"`
	Region             string         `json:"region"`
	Size               string         `json:"size"`
	Image              string         `json:"image"`
	ExpiresAt          time.Time      `json:"expires_at"`
	SSHKeyFingerprints []string       `json:"ssh_key_fingerprints"`
	UserData           string         `json:"user_data"`
	Metadata           map[string]any `json:"metadata"`
}

type CreatePodRequest struct {
	RequestID  string         `json:"request_id"`
	TraceID    string         `json:"trace_id"`
	UserID     string         `json:"user_id"`
	ProviderID string         `json:"provider_id"`
	Name       string         `json:"name"`
	ImageName  string         `json:"image_name"`
	GPUTypeID  string         `json:"gpu_type_id"`
	GPUCount   int            `json:"gpu_count"`
	CPUCount   int            `json:"cpu_count"`
	MemoryGB   int            `json:"memory_gb"`
	ExpiresAt  time.Time      `json:"expires_at"`
	Metadata   map[string]any `json:"metadata"`
}

type DeleteRequest struct {
	RequestID string `json:"request_id"`
	TraceID   string `json:"trace_id"`
}

type ProvisionResult struct {
	JobID       string `json:"job_id"`
	RequestID   string `json:"request_id"`
	TraceID     string `json:"trace_id"`
	ExternalID  string `json:"external_id"`
	PublicIP    string `json:"public_ip"`
	Status      string `json:"status"`
	Error       string `json:"error,omitempty"`
}

func NewClient(baseURL string, serviceToken string, timeout time.Duration) *Client {
	if timeout <= 0 {
		timeout = 25 * time.Second
	}
	return &Client{
		baseURL:      strings.TrimRight(baseURL, "/"),
		serviceToken: strings.TrimSpace(serviceToken),
		httpClient:   &http.Client{Timeout: timeout},
	}
}

func (c *Client) CreateVM(ctx context.Context, req CreateVMRequest) (ProvisionResult, error) {
	var result ProvisionResult
	if err := c.call(ctx, http.MethodPost, "/v1/provisioning/vm", req, &result); err != nil {
		return ProvisionResult{}, err
	}
	return result, nil
}

func (c *Client) DeleteVM(ctx context.Context, externalID string, req DeleteRequest) error {
	return c.call(ctx, http.MethodDelete, "/v1/provisioning/vm/"+externalID, req, nil)
}

func (c *Client) CreatePod(ctx context.Context, req CreatePodRequest) (ProvisionResult, error) {
	var result ProvisionResult
	if err := c.call(ctx, http.MethodPost, "/v1/provisioning/pod", req, &result); err != nil {
		return ProvisionResult{}, err
	}
	return result, nil
}

func (c *Client) DeletePod(ctx context.Context, externalID string, req DeleteRequest) error {
	return c.call(ctx, http.MethodDelete, "/v1/provisioning/pod/"+externalID, req, nil)
}

func BuildVMCloudInit(resource models.VM, vmDaemonDownloadURL string, kafkaBrokers string, kafkaTopic string) string {
	return fmt.Sprintf(`#cloud-config
package_update: true
write_files:
  - path: /etc/sharemtc-vmdaemon.env
    permissions: "0600"
    owner: root:root
    content: |
      RESOURCE_PROVIDER_ID=%s
      RESOURCE_ID=%s
      RESOURCE_TYPE=vm
      KAFKA_BROKERS=%s
      KAFKA_TOPIC=%s
runcmd:
  - curl -fsSL %s -o /usr/local/bin/sharemtc-vmdaemon
  - chmod +x /usr/local/bin/sharemtc-vmdaemon
  - |
    cat > /etc/systemd/system/sharemtc-vmdaemon.service <<'EOF'
    [Unit]
    Description=ShareMTC VM Daemon
    After=network-online.target auditd.service
    Wants=network-online.target
    [Service]
    EnvironmentFile=/etc/sharemtc-vmdaemon.env
    ExecStart=/usr/local/bin/sharemtc-vmdaemon
    Restart=always
    RestartSec=5
    [Install]
    WantedBy=multi-user.target
    EOF
  - systemctl daemon-reload
  - systemctl enable --now sharemtc-vmdaemon
`, resource.ProviderID, resource.ID, kafkaBrokers, kafkaTopic, vmDaemonDownloadURL)
}

func (c *Client) call(ctx context.Context, method string, path string, payload any, out any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Service-Token", c.serviceToken)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("provisioningservice %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	if out == nil {
		return nil
	}
	return json.Unmarshal(body, out)
}
