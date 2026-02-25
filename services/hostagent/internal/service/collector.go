package service

import (
	"time"

	"github.com/MidasWR/ShareMTC/services/hostagent/internal/models"
)

type CPUState struct {
	Total uint64
	Idle  uint64
}

type NetState struct {
	LastBytes int64
	LastAt    time.Time
	LastCPU   CPUState
}

func Collect(providerID string, state NetState) (models.HostMetric, NetState, error) {
	cpuFreeCores, nextCPUState, err := cpuFreeCores(state.LastCPU)
	if err != nil {
		return models.HostMetric{}, state, err
	}
	freeMB, err := memFreeMB()
	if err != nil {
		return models.HostMetric{}, state, err
	}
	currentBytes, err := networkBytes()
	if err != nil {
		return models.HostMetric{}, state, err
	}
	gpuFreeUnits, gpuTotalUnits, gpuMemoryTotalMB, gpuMemoryUsedMB := gpuMetrics()

	networkMbps := 0
	now := time.Now().UTC()
	if !state.LastAt.IsZero() && currentBytes >= state.LastBytes {
		diffBytes := currentBytes - state.LastBytes
		diffSec := now.Sub(state.LastAt).Seconds()
		if diffSec > 0 {
			networkMbps = int((float64(diffBytes) * 8.0 / 1_000_000.0) / diffSec)
		}
	}

	return models.HostMetric{
		ProviderID:       providerID,
		CPUFreeCores:     cpuFreeCores,
		RAMFreeMB:        freeMB,
		GPUFreeUnits:     gpuFreeUnits,
		GPUTotalUnits:    gpuTotalUnits,
		GPUMemoryTotalMB: gpuMemoryTotalMB,
		GPUMemoryUsedMB:  gpuMemoryUsedMB,
		NetworkMbps:      networkMbps,
		HeartbeatAt:      now,
	}, NetState{LastBytes: currentBytes, LastAt: now, LastCPU: nextCPUState}, nil
}
