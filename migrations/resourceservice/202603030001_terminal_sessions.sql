CREATE TABLE IF NOT EXISTS terminal_sessions (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    resource_id TEXT NOT NULL DEFAULT '',
    renter_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    rows INTEGER NOT NULL DEFAULT 24,
    cols INTEGER NOT NULL DEFAULT 80,
    last_input_seq BIGINT NOT NULL DEFAULT 0,
    last_output_seq BIGINT NOT NULL DEFAULT 0,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    exit_code INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_terminal_sessions_provider ON terminal_sessions(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_terminal_sessions_renter ON terminal_sessions(renter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_terminal_sessions_status ON terminal_sessions(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS terminal_chunks (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES terminal_sessions(id) ON DELETE CASCADE,
    provider_id TEXT NOT NULL,
    direction TEXT NOT NULL,
    seq BIGINT NOT NULL,
    data TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_terminal_chunks_unique_seq ON terminal_chunks(session_id, direction, seq);
CREATE INDEX IF NOT EXISTS idx_terminal_chunks_output ON terminal_chunks(session_id, direction, seq);

CREATE TABLE IF NOT EXISTS terminal_audit_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES terminal_sessions(id) ON DELETE CASCADE,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_terminal_audit_session ON terminal_audit_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_terminal_audit_provider ON terminal_audit_events(provider_id, created_at DESC);

ALTER TABLE agent_commands ADD COLUMN IF NOT EXISTS resource_id TEXT NOT NULL DEFAULT '';
ALTER TABLE agent_commands ADD COLUMN IF NOT EXISTS session_id TEXT NOT NULL DEFAULT '';
ALTER TABLE agent_commands ADD COLUMN IF NOT EXISTS payload TEXT NOT NULL DEFAULT '';
ALTER TABLE agent_commands ADD COLUMN IF NOT EXISTS rows INTEGER NOT NULL DEFAULT 0;
ALTER TABLE agent_commands ADD COLUMN IF NOT EXISTS cols INTEGER NOT NULL DEFAULT 0;

