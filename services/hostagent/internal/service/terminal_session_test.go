package service

import (
	"strings"
	"testing"
	"time"
)

func TestTerminalManagerOpenWriteClose(t *testing.T) {
	output := make(chan string, 4)
	manager := NewTerminalManager(func(_ string, payload string) {
		output <- payload
	})

	if err := manager.Open("s1", 24, 80); err != nil {
		t.Fatalf("open terminal: %v", err)
	}
	if err := manager.Write("s1", "echo terminal_test\n"); err != nil {
		t.Fatalf("write terminal: %v", err)
	}

	deadline := time.After(3 * time.Second)
	received := ""
	for {
		select {
		case payload := <-output:
			received += payload
			if strings.Contains(received, "terminal_test") {
				goto done
			}
		case <-deadline:
			t.Fatalf("did not receive terminal output, got: %q", received)
		}
	}

done:
	if err := manager.Close("s1"); err != nil {
		t.Fatalf("close terminal: %v", err)
	}
}
