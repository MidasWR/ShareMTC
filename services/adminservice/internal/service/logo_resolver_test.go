package service

import "testing"

func TestResolvePodLogoURL(t *testing.T) {
	if got := resolvePodLogoURL("pod-gpu-1", "NVIDIA RTX 4090"); got != "/logos/sharemtc-mark.svg" {
		t.Fatalf("expected shared brand mark logo, got %s", got)
	}
	if got := resolvePodLogoURL("custom", "cpu-only"); got != "/logos/sharemtc-mark.svg" {
		t.Fatalf("expected fallback logo, got %s", got)
	}
}
