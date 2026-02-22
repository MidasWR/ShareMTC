package service

import (
	"bufio"
	"errors"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/MidasWR/ShareMTC/services/hostagent/internal/models"
)

type NetState struct {
	LastBytes int64
	LastAt    time.Time
}

func Collect(providerID string, state NetState) (models.HostMetric, NetState, error) {
	freeMB, err := memFreeMB()
	if err != nil {
		return models.HostMetric{}, state, err
	}
	currentBytes, err := networkBytes()
	if err != nil {
		return models.HostMetric{}, state, err
	}

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
		ProviderID:   providerID,
		CPUFreeCores: runtime.NumCPU(),
		RAMFreeMB:    freeMB,
		GPUFreeUnits: detectGPUUnits(),
		NetworkMbps:  networkMbps,
		HeartbeatAt:  now,
	}, NetState{LastBytes: currentBytes, LastAt: now}, nil
}

func memFreeMB() (int, error) {
	file, err := os.Open("/proc/meminfo")
	if err != nil {
		return 0, err
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "MemAvailable:") {
			fields := strings.Fields(line)
			if len(fields) < 2 {
				return 0, errors.New("unexpected meminfo format")
			}
			kb, err := strconv.Atoi(fields[1])
			if err != nil {
				return 0, err
			}
			return kb / 1024, nil
		}
	}
	return 0, errors.New("memavailable not found")
}

func networkBytes() (int64, error) {
	file, err := os.Open("/proc/net/dev")
	if err != nil {
		return 0, err
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	total := int64(0)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if !strings.Contains(line, ":") {
			continue
		}
		if strings.HasPrefix(line, "lo:") {
			continue
		}
		parts := strings.Split(line, ":")
		fields := strings.Fields(parts[1])
		if len(fields) < 9 {
			continue
		}
		rx, err := strconv.ParseInt(fields[0], 10, 64)
		if err != nil {
			return 0, err
		}
		tx, err := strconv.ParseInt(fields[8], 10, 64)
		if err != nil {
			return 0, err
		}
		total += rx + tx
	}
	return total, nil
}

func detectGPUUnits() int {
	_, err := os.Stat("/proc/driver/nvidia/gpus")
	if err == nil {
		return 1
	}
	return 0
}
