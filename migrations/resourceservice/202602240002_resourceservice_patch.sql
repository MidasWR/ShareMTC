-- Patch migration for existing clusters with partial resourceservice schema.
-- Safe to run multiple times.

ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'any';
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS cloud_type TEXT NOT NULL DEFAULT 'secure';
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS vcpu INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS system_ram_gb INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS vram_gb INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS network_volume_supported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS global_networking_supported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS availability_tier TEXT NOT NULL DEFAULT 'low';
ALTER TABLE vm_templates ADD COLUMN IF NOT EXISTS max_instances INTEGER NOT NULL DEFAULT 1;

ALTER TABLE vms ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT 'any';
ALTER TABLE vms ADD COLUMN IF NOT EXISTS cloud_type TEXT NOT NULL DEFAULT 'secure';
ALTER TABLE vms ADD COLUMN IF NOT EXISTS vcpu INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vms ADD COLUMN IF NOT EXISTS system_ram_gb INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vms ADD COLUMN IF NOT EXISTS vram_gb INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vms ADD COLUMN IF NOT EXISTS network_volume_supported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vms ADD COLUMN IF NOT EXISTS global_networking_supported BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vms ADD COLUMN IF NOT EXISTS availability_tier TEXT NOT NULL DEFAULT 'low';
ALTER TABLE vms ADD COLUMN IF NOT EXISTS max_instances INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_vms_region_cloud ON vms(region, cloud_type);
CREATE INDEX IF NOT EXISTS idx_vms_vram_availability ON vms(vram_gb, availability_tier);
CREATE INDEX IF NOT EXISTS idx_templates_region_cloud ON vm_templates(region, cloud_type);
CREATE INDEX IF NOT EXISTS idx_templates_vram_availability ON vm_templates(vram_gb, availability_tier);
