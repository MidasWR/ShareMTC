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
	cpuTotalCores := cpuTotalCores()
	cpuFreeCores, nextCPUState, err := cpuFreeCores(state.LastCPU)
	if err != nil {
		return models.HostMetric{}, state, err
	}
	ramTotalMB, err := memTotalMB()
	if err != nil {
		return models.HostMetric{}, state, err
	}
	freeMB, err := memFreeMB()
	if err != nil {
		return models.HostMetric{}, state, err
	}
	diskTotalMB, diskFreeMB, err := diskUsageMB("/")
	if err != nil {
		return models.HostMetric{}, state, err
	}
	load1m, err := loadAvg1m()
	if err != nil {
		return models.HostMetric{}, state, err
	}
	uptimeSec, err := uptimeSeconds()
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
		CPUTotalCores:    cpuTotalCores,
		CPUFreeCores:     cpuFreeCores,
		RAMTotalMB:       ramTotalMB,
		RAMFreeMB:        freeMB,
		GPUFreeUnits:     gpuFreeUnits,
		GPUTotalUnits:    gpuTotalUnits,
		GPUMemoryTotalMB: gpuMemoryTotalMB,
		GPUMemoryUsedMB:  gpuMemoryUsedMB,
		DiskTotalMB:      diskTotalMB,
		DiskFreeMB:       diskFreeMB,
		NetworkMbps:      networkMbps,
		LoadAvg1m:        load1m,
		UptimeSeconds:    uptimeSec,
		HeartbeatAt:      now,
	}, NetState{LastBytes: currentBytes, LastAt: now, LastCPU: nextCPUState}, nil
}
