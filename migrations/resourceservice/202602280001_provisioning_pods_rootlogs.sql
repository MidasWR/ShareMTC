-- Provisioning and pod lifecycle extensions.

ALTER TABLE vms ADD COLUMN IF NOT EXISTS external_id TEXT NOT NULL DEFAULT '';
ALTER TABLE vms ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes';
CREATE INDEX IF NOT EXISTS idx_vms_expiry ON vms(status, expires_at);

CREATE TABLE IF NOT EXISTS pod_instances (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    name TEXT NOT NULL,
    image_name TEXT NOT NULL,
    gpu_type_id TEXT NOT NULL,
    gpu_count INTEGER NOT NULL,
    cpu_count INTEGER NOT NULL,
    memory_gb INTEGER NOT NULL,
    external_id TEXT NOT NULL DEFAULT '',
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pod_instances_user ON pod_instances(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pod_instances_expiry ON pod_instances(status, expires_at);

CREATE TABLE IF NOT EXISTS root_input_logs (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    username TEXT NOT NULL DEFAULT 'root',
    tty TEXT NOT NULL DEFAULT '',
    command TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'vmdaemon',
    executed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_root_input_logs_provider ON root_input_logs(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_root_input_logs_resource ON root_input_logs(resource_id, executed_at DESC);

CREATE TABLE IF NOT EXISTS create_rate_limit_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_create_rate_limit_events_user ON create_rate_limit_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS provisioning_jobs (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL UNIQUE,
    trace_id TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL,
    external_id TEXT NOT NULL DEFAULT '',
    error TEXT NOT NULL DEFAULT '',
    response_json TEXT NOT NULL DEFAULT '{}',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_resources (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    internal_id TEXT NOT NULL DEFAULT '',
    external_id TEXT NOT NULL,
    status TEXT NOT NULL,
    public_ip TEXT NOT NULL DEFAULT '',
    expires_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ,
    last_error TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_resources_exp ON external_resources(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_external_resources_ext ON external_resources(external_id, provider, resource_type);
