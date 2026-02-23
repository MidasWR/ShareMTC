import { FormEvent, useEffect, useState } from "react";
import { createSSHKey, deleteSSHKey, getUserSettings, listSSHKeys, upsertUserSettings } from "../auth/api/authApi";
import { SSHKey, UserSettings } from "../../types/api";
import { useToast } from "../../design/components/Toast";
import { PageSectionHeader } from "../../design/patterns/PageSectionHeader";
import { Card } from "../../design/primitives/Card";
import { Input } from "../../design/primitives/Input";
import { Select } from "../../design/primitives/Select";
import { Button } from "../../design/primitives/Button";
import { Table } from "../../design/components/Table";
import { EmptyState } from "../../design/patterns/EmptyState";

export function SettingsPanel() {
  const [settings, setSettings] = useState<UserSettings>({ theme: "system", language: "ru", timezone: "UTC" });
  const [sshKeys, setSSHKeys] = useState<SSHKey[]>([]);
  const [keyName, setKeyName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const [s, keys] = await Promise.all([getUserSettings(), listSSHKeys()]);
        setSettings(s);
        setSSHKeys(keys);
      } catch (error) {
        push("error", error instanceof Error ? error.message : "Не удалось загрузить настройки");
      }
    }
    load();
  }, []);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const saved = await upsertUserSettings(settings);
      setSettings(saved);
      push("success", "Настройки сохранены");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  }

  async function addSSHKey(event: FormEvent) {
    event.preventDefault();
    if (!keyValue.startsWith("ssh-")) {
      push("error", "SSH ключ должен начинаться с ssh-rsa/ssh-ed25519");
      return;
    }
    setLoading(true);
    try {
      const created = await createSSHKey({ name: keyName || "Основной ключ", public_key: keyValue.trim() });
      setSSHKeys((prev) => [created, ...prev]);
      setKeyName("");
      setKeyValue("");
      push("success", "SSH ключ добавлен");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Ошибка добавления SSH ключа");
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
      push("info", "SSH ключ удалён");
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Ошибка удаления SSH ключа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader title="Персонализация и SSH доступ" description="Личные настройки интерфейса и управление публичными SSH ключами." />
      <Card title="Персонализация" description="Тема, язык и часовой пояс рабочего пространства.">
        <form className="grid gap-3 md:grid-cols-3" onSubmit={saveSettings}>
          <Select
            label="Тема"
            value={settings.theme}
            onChange={(event) => setSettings((prev) => ({ ...prev, theme: event.target.value }))}
            options={[
              { value: "system", label: "System" },
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" }
            ]}
          />
          <Select
            label="Язык"
            value={settings.language}
            onChange={(event) => setSettings((prev) => ({ ...prev, language: event.target.value }))}
            options={[
              { value: "ru", label: "Русский" },
              { value: "en", label: "English" }
            ]}
          />
          <Input
            label="Часовой пояс"
            value={settings.timezone}
            onChange={(event) => setSettings((prev) => ({ ...prev, timezone: event.target.value }))}
          />
          <div className="md:col-span-3">
            <Button type="submit" loading={loading}>Сохранить настройки</Button>
          </div>
        </form>
      </Card>

      <Card title="SSH ключи доступа" description="Публичные ключи для доступа к арендованным серверам и pods.">
        <form className="space-y-3" onSubmit={addSSHKey}>
          <Input label="Имя ключа" value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="Рабочий ноутбук" />
          <Input label="Публичный SSH ключ" value={keyValue} onChange={(event) => setKeyValue(event.target.value)} placeholder="ssh-ed25519 AAAA..." />
          <Button type="submit" loading={loading}>Добавить ключ</Button>
        </form>
        <div className="mt-4">
          <Table
            ariaLabel="SSH ключи пользователя"
            rowKey={(row) => row.id ?? row.name}
            items={sshKeys}
            emptyState={<EmptyState title="SSH ключей пока нет" description="Добавьте минимум один ключ для доступа к машинам." />}
            columns={[
              { key: "name", header: "Имя", render: (row) => row.name },
              { key: "key", header: "Ключ", render: (row) => <span className="font-mono text-xs">{row.public_key}</span> },
              { key: "created", header: "Создан", render: (row) => (row.created_at ? new Date(row.created_at).toLocaleString() : "-") },
              { key: "actions", header: "Действия", render: (row) => <Button variant="ghost" size="sm" onClick={() => removeSSHKey(row.id)}>Удалить</Button> }
            ]}
          />
        </div>
      </Card>
    </section>
  );
}
