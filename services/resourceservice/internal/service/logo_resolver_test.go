package service

import "testing"

func TestResolveTemplateLogoURL(t *testing.T) {
	if got := resolveTemplateLogoURL("fastpanel", "FastPanel"); got != "/logos/fastpanel.svg" {
		t.Fatalf("expected fastpanel logo, got %s", got)
	}
	if got := resolveTemplateLogoURL("aapanel", "aaPanel"); got != "/logos/aapanel.svg" {
		t.Fatalf("expected aapanel logo, got %s", got)
	}
	if got := resolveTemplateLogoURL("custom", "Custom"); got != "/logos/sharemtc-mark.svg" {
		t.Fatalf("expected fallback logo, got %s", got)
	}
}
