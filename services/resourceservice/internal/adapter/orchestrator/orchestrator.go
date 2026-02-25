package orchestrator

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type ClusterSpec struct {
	Name       string
	NodeCount  int
	NodeType   string
	K8sVersion string
}

type RuntimeCluster struct {
	Endpoint   string
	Kubeconfig string
}

type Runtime interface {
	ProvisionCluster(ctx context.Context, spec ClusterSpec) (RuntimeCluster, error)
	DeleteCluster(ctx context.Context, clusterID string) error
	RefreshClusterStatus(ctx context.Context, clusterID string) (string, error)
}

type InternalRuntime struct{}

// InternalRuntime returns synthetic cluster state for control-plane lifecycle flow.
// It does not provide workload isolation and must not be presented as secure execution.
func NewInternalRuntime() *InternalRuntime {
	return &InternalRuntime{}
}

func (r *InternalRuntime) ProvisionCluster(_ context.Context, spec ClusterSpec) (RuntimeCluster, error) {
	clusterID := uuid.NewString()
	endpoint := fmt.Sprintf("https://%s.internal.k8s.sharemct.local", clusterID[:8])
	kubeconfig := fmt.Sprintf(
		"apiVersion: v1\nkind: Config\nclusters:\n- cluster:\n    server: %s\n  name: %s\ncontexts:\n- context:\n    cluster: %s\n    user: %s-admin\n  name: %s\ncurrent-context: %s\nusers:\n- name: %s-admin\n  user:\n    token: internal-%s\nmetadata:\n  nodeCount: %d\n  nodeType: %s\n  k8sVersion: %s\n  generatedAt: %s\n",
		endpoint,
		spec.Name,
		spec.Name,
		spec.Name,
		spec.Name,
		spec.Name,
		spec.Name,
		clusterID[:12],
		spec.NodeCount,
		spec.NodeType,
		spec.K8sVersion,
		time.Now().UTC().Format(time.RFC3339),
	)
	return RuntimeCluster{
		Endpoint:   endpoint,
		Kubeconfig: kubeconfig,
	}, nil
}

func (r *InternalRuntime) DeleteCluster(_ context.Context, _ string) error {
	return nil
}

func (r *InternalRuntime) RefreshClusterStatus(_ context.Context, _ string) (string, error) {
	return "running", nil
}
