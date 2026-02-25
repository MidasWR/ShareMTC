//go:build !linux

package service

import "errors"

var errUnsupportedPlatform = errors.New("hostagent telemetry collector currently supports Linux provider nodes only")

func cpuFreeCores(previous CPUState) (int, CPUState, error) {
	return 0, previous, errUnsupportedPlatform
}

func memFreeMB() (int, error) {
	return 0, errUnsupportedPlatform
}

func networkBytes() (int64, error) {
	return 0, errUnsupportedPlatform
}

func gpuMetrics() (int, int, int, int) {
	return 0, 0, 0, 0
}
