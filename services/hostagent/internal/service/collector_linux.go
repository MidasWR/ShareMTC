//go:build linux

package service

import (
	"bufio"
	"errors"
	"math"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"strings"
)

const gpuBusyThreshold = 0.85

type gpuDevice struct {
	totalMB int
	usedMB  int
}

func cpuFreeCores(previous CPUState) (int, CPUState, error) {
	current, err := readCPUSnapshot()
	if err != nil {
		return 0, CPUState{}, err
	}
	cpuCount := runtime.NumCPU()
	if cpuCount <= 0 {
		return 0, current, errors.New("invalid cpu count")
	}
	if previous.Total == 0 || current.Total <= previous.Total || current.Idle < previous.Idle {
		load1m, err := loadAvg1m()
		if err != nil {
			return 0, current, err
		}
		return clampInt(int(math.Round(float64(cpuCount)-load1m)), 0, cpuCount), current, nil
	}
	return computeFreeCoresFromSnapshots(previous, current, cpuCount), current, nil
}

func computeFreeCoresFromSnapshots(previous CPUState, current CPUState, cpuCount int) int {
	totalDelta := float64(current.Total - previous.Total)
	idleDelta := float64(current.Idle - previous.Idle)
	if totalDelta <= 0 || cpuCount <= 0 {
		return 0
	}
	freeRatio := idleDelta / totalDelta
	return clampInt(int(math.Round(freeRatio*float64(cpuCount))), 0, cpuCount)
}

func readCPUSnapshot() (CPUState, error) {
	file, err := os.Open("/proc/stat")
	if err != nil {
		return CPUState{}, err
	}
	defer file.Close()
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if !strings.HasPrefix(line, "cpu ") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 5 {
			return CPUState{}, errors.New("unexpected /proc/stat cpu format")
		}
		total := uint64(0)
		for i := 1; i < len(fields); i++ {
			value, err := strconv.ParseUint(fields[i], 10, 64)
			if err != nil {
				return CPUState{}, err
			}
			total += value
		}
		idle, err := strconv.ParseUint(fields[4], 10, 64)
		if err != nil {
			return CPUState{}, err
		}
		return CPUState{Total: total, Idle: idle}, nil
	}
	if err := scanner.Err(); err != nil {
		return CPUState{}, err
	}
	return CPUState{}, errors.New("cpu snapshot not found")
}

func loadAvg1m() (float64, error) {
	data, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return 0, err
	}
	fields := strings.Fields(string(data))
	if len(fields) < 1 {
		return 0, errors.New("unexpected /proc/loadavg format")
	}
	return strconv.ParseFloat(fields[0], 64)
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
	if err := scanner.Err(); err != nil {
		return 0, err
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
	if err := scanner.Err(); err != nil {
		return 0, err
	}
	return total, nil
}

func gpuMetrics() (int, int, int, int) {
	devices, err := queryNvidiaSMI()
	if err != nil || len(devices) == 0 {
		totalUnits := countNvidiaProcDevices()
		return totalUnits, totalUnits, 0, 0
	}
	freeUnits := 0
	totalMem := 0
	usedMem := 0
	for _, device := range devices {
		totalMem += device.totalMB
		usedMem += device.usedMB
		if device.totalMB == 0 || float64(device.usedMB)/float64(device.totalMB) < gpuBusyThreshold {
			freeUnits++
		}
	}
	return freeUnits, len(devices), totalMem, usedMem
}

func queryNvidiaSMI() ([]gpuDevice, error) {
	cmd := exec.Command("nvidia-smi", "--query-gpu=memory.total,memory.used", "--format=csv,noheader,nounits")
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}
	return parseNvidiaSMIOutput(string(out))
}

func parseNvidiaSMIOutput(raw string) ([]gpuDevice, error) {
	lines := strings.Split(strings.TrimSpace(raw), "\n")
	devices := make([]gpuDevice, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.Split(line, ",")
		if len(parts) != 2 {
			return nil, errors.New("unexpected nvidia-smi output format")
		}
		totalMB, err := strconv.Atoi(strings.TrimSpace(parts[0]))
		if err != nil {
			return nil, err
		}
		usedMB, err := strconv.Atoi(strings.TrimSpace(parts[1]))
		if err != nil {
			return nil, err
		}
		devices = append(devices, gpuDevice{totalMB: totalMB, usedMB: usedMB})
	}
	return devices, nil
}

func countNvidiaProcDevices() int {
	entries, err := os.ReadDir("/proc/driver/nvidia/gpus")
	if err != nil {
		return 0
	}
	return len(entries)
}

func clampInt(value int, min int, max int) int {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}
