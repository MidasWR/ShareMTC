package service

import (
	"errors"
	"io"
	"os"
	"os/exec"
	"sync"

	"github.com/creack/pty"
)

type TerminalOutputSink func(sessionID string, payload string)

type terminalProcess struct {
	cmd *exec.Cmd
	pty *os.File
}

type TerminalManager struct {
	mu       sync.Mutex
	sessions map[string]*terminalProcess
	sink     TerminalOutputSink
}

func NewTerminalManager(sink TerminalOutputSink) *TerminalManager {
	return &TerminalManager{
		sessions: make(map[string]*terminalProcess),
		sink:     sink,
	}
}

func (m *TerminalManager) Open(sessionID string, rows int, cols int) error {
	if sessionID == "" {
		return errors.New("session id is required")
	}
	if rows <= 0 {
		rows = 24
	}
	if cols <= 0 {
		cols = 80
	}
	m.mu.Lock()
	if _, exists := m.sessions[sessionID]; exists {
		m.mu.Unlock()
		return nil
	}
	cmd := exec.Command("/bin/bash")
	file, err := pty.StartWithSize(cmd, &pty.Winsize{
		Rows: uint16(rows),
		Cols: uint16(cols),
	})
	if err != nil {
		m.mu.Unlock()
		return err
	}
	proc := &terminalProcess{cmd: cmd, pty: file}
	m.sessions[sessionID] = proc
	m.mu.Unlock()

	go m.pumpOutput(sessionID, proc)
	return nil
}

func (m *TerminalManager) Write(sessionID string, payload string) error {
	m.mu.Lock()
	proc, ok := m.sessions[sessionID]
	m.mu.Unlock()
	if !ok {
		return errors.New("terminal session is not open")
	}
	_, err := proc.pty.Write([]byte(payload))
	return err
}

func (m *TerminalManager) Resize(sessionID string, rows int, cols int) error {
	m.mu.Lock()
	proc, ok := m.sessions[sessionID]
	m.mu.Unlock()
	if !ok {
		return errors.New("terminal session is not open")
	}
	return pty.Setsize(proc.pty, &pty.Winsize{
		Rows: uint16(rows),
		Cols: uint16(cols),
	})
}

func (m *TerminalManager) Close(sessionID string) error {
	m.mu.Lock()
	proc, ok := m.sessions[sessionID]
	if ok {
		delete(m.sessions, sessionID)
	}
	m.mu.Unlock()
	if !ok {
		return nil
	}
	_ = proc.pty.Close()
	return proc.cmd.Process.Kill()
}

func (m *TerminalManager) pumpOutput(sessionID string, proc *terminalProcess) {
	buf := make([]byte, 2048)
	for {
		n, err := proc.pty.Read(buf)
		if n > 0 && m.sink != nil {
			m.sink(sessionID, string(buf[:n]))
		}
		if err != nil {
			if errors.Is(err, io.EOF) {
				return
			}
			return
		}
	}
}
