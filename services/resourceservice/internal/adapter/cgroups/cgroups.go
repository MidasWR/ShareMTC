package cgroups

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type V2Applier struct {
	root string
}

// NewV2Applier enforces coarse CPU/RAM limits for allocations.
// It is an accounting guardrail for the control plane, not a sandbox boundary.
func NewV2Applier(root string) *V2Applier {
	if root == "" {
		root = "/sys/fs/cgroup/host"
	}
	return &V2Applier{root: root}
}

func (a *V2Applier) Apply(providerID string, cpuCores int, ramMB int, gpuUnits int) error {
	_ = gpuUnits
	dir := filepath.Join(a.root, providerID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}

	quota := cpuCores * 100000
	if err := os.WriteFile(filepath.Join(dir, "cpu.max"), []byte(fmt.Sprintf("%d %d", quota, 100000)), 0o644); err != nil {
		return err
	}
	memory := ramMB * 1024 * 1024
	if err := os.WriteFile(filepath.Join(dir, "memory.max"), []byte(strconv.Itoa(memory)), 0o644); err != nil {
		return err
	}
	return nil
}

func (a *V2Applier) Release(allocationID string) error {
	parts := strings.SplitN(allocationID, "_", 2)
	if len(parts) == 0 {
		return nil
	}
	dir := filepath.Join(a.root, parts[0])
	return os.RemoveAll(dir)
}
