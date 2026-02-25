import { FormEvent, useEffect, useState } from "react";
import { createSSHKey, deleteSSHKey, listSSHKeys, upsertUserSettings } from "../auth/api/authApi";
import { SSHKey } from "../../types/api";
import { useToast } from "../../design/components/Toast";
import { PageSectionHeader } from "../../design/patterns/PageSectionHeader";
import { Card } from "../../design/primitives/Card";
import { Input } from "../../design/primitives/Input";
import { Select } from "../../design/primitives/Select";
import { Button } from "../../design/primitives/Button";
import { Table } from "../../design/components/Table";
import { EmptyState } from "../../design/patterns/EmptyState";
import { useSettings } from "../../app/providers/SettingsProvider";

export function SettingsPanel() {
  const { settings, updateSettingsState, brandTheme, updateBrandTheme } = useSettings();
  const [sshKeys, setSSHKeys] = useState<SSHKey[]>([]);
  const [keyName, setKeyName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const keys = await listSSHKeys();
        setSSHKeys(keys);
      } catch (error) {
        push("error", error instanceof Error ? error.message : "Failed to load keys");
      }
    }
    load();
  }, []);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const saved = await upsertUserSettings(settings);
      updateSettingsState(saved);
      push("success", "Settings saved");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setLoading(false);
    }
  }

  async function addSSHKey(event: FormEvent) {
    event.preventDefault();
    if (!keyValue.startsWith("ssh-")) {
      push("error", "SSH key must start with ssh-rsa/ssh-ed25519");
      return;
    }
    setLoading(true);
    try {
      const created = await createSSHKey({ name: keyName || "Primary key", public_key: keyValue.trim() });
      setSSHKeys((prev) => [created, ...prev]);
      setKeyName("");
      setKeyValue("");
      push("success", "SSH key added");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to add SSH key");
    } finally {
      setLoading(false);
    }
  }

  async function removeSSHKey(id?: string) {
    if (!id) return;
    setLoading(true);
    try {
      await deleteSSHKey(id);
      setSSHKeys((prev) => prev.filter((item) => item.id !== id));
      push("info", "SSH key removed");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Failed to remove SSH key");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader title="Personalization & SSH Access" description="User interface preferences and SSH public key management." />
      <Card title="Personalization" description="Theme, language, and timezone settings.">
        <form className="grid gap-3 md:grid-cols-4" onSubmit={saveSettings}>
          <Select
            label="Theme"
            value={settings.theme}
            onChange={(event) => updateSettingsState({ theme: event.target.value })}
            options={[
              { value: "system", label: "System" },
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" }
            ]}
          />
          <Select
            label="Language"
            value={settings.language}
            onChange={(event) => updateSettingsState({ language: event.target.value })}
            options={[
              { value: "en", label: "English" }
            ]}
          />
          <Input
            label="Timezone"
            value={settings.timezone}
            onChange={(event) => updateSettingsState({ timezone: event.target.value })}
          />
          <Select
            label="Brand theme"
            value={brandTheme}
            onChange={(event) => updateBrandTheme(event.target.value as "mts" | "neon")}
            options={[
              { value: "mts", label: "MTS (demo default)" },
              { value: "neon", label: "Neon" }
            ]}
          />
          <div className="md:col-span-4">
            <Button type="submit" loading={loading}>Save settings</Button>
          </div>
        </form>
      </Card>

      <Card title="SSH Access Keys" description="Public keys used to access rented servers and PODs.">
        <form className="space-y-3" onSubmit={addSSHKey}>
          <Input label="Key name" value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="Work laptop" />
          <Input label="Public SSH key" value={keyValue} onChange={(event) => setKeyValue(event.target.value)} placeholder="ssh-ed25519 AAAA..." />
          <Button type="submit" loading={loading}>Add key</Button>
        </form>
        <div className="mt-4">
          <Table
            ariaLabel="User SSH keys"
            rowKey={(row) => row.id ?? row.name}
            items={sshKeys}
            emptyState={<EmptyState title="No SSH keys yet" description="Add at least one key to access machines." />}
            columns={[
              { key: "name", header: "Name", render: (row) => row.name },
              { key: "key", header: "Key", render: (row) => <span className="font-mono text-xs">{row.public_key}</span> },
              { key: "created", header: "Created", render: (row) => (row.created_at ? new Date(row.created_at).toLocaleString() : "-") },
              { key: "actions", header: "Actions", render: (row) => <Button variant="ghost" size="sm" onClick={() => removeSSHKey(row.id)}>Delete</Button> }
            ]}
          />
        </div>
      </Card>
    </section>
  );
}
