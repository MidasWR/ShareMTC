//go:build linux

package service

import "testing"

func TestComputeFreeCoresFromSnapshots(t *testing.T) {
	previous := CPUState{Total: 1_000, Idle: 300}
	current := CPUState{Total: 2_000, Idle: 1_000}
	got := computeFreeCoresFromSnapshots(previous, current, 8)
	if got != 6 {
		t.Fatalf("expected 6 free cores, got %d", got)
	}
}

func TestParseNvidiaSMIOutput(t *testing.T) {
	devices, err := parseNvidiaSMIOutput("24576, 1024\n24576, 24000\n")
	if err != nil {
		t.Fatalf("parse nvidia-smi output: %v", err)
	}
	if len(devices) != 2 {
		t.Fatalf("expected 2 devices, got %d", len(devices))
	}
	if devices[0].totalMB != 24576 || devices[0].usedMB != 1024 {
		t.Fatalf("unexpected first device values: %+v", devices[0])
	}
}

func TestClampInt(t *testing.T) {
	if got := clampInt(-1, 0, 8); got != 0 {
		t.Fatalf("expected 0, got %d", got)
	}
	if got := clampInt(10, 0, 8); got != 8 {
		t.Fatalf("expected 8, got %d", got)
	}
	if got := clampInt(5, 0, 8); got != 5 {
		t.Fatalf("expected 5, got %d", got)
	}
}
