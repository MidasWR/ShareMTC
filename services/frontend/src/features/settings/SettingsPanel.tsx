import { FormEvent, useEffect, useState } from "react";
import { createSSHKey, deleteSSHKey, listSSHKeys, upsertUserSettings } from "../auth/api/authApi";
import { LuInfo } from "react-icons/lu";
import { SSHKey } from "../../types/api";
import { useToast } from "../../design/components/Toast";
import { PageSectionHeader } from "../../design/patterns/PageSectionHeader";
import { Card } from "../../design/primitives/Card";
import { Input } from "../../design/primitives/Input";
import { Icon } from "../../design/primitives/Icon";
import { Select } from "../../design/primitives/Select";
import { Button } from "../../design/primitives/Button";
import { Textarea } from "../../design/primitives/Textarea";
import { Table } from "../../design/components/Table";
import { EmptyState } from "../../design/patterns/EmptyState";
import { useSettings } from "../../app/providers/SettingsProvider";

function truncateSSHKey(value: string, head = 28, tail = 16) {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function SettingsPanel() {
  const { settings, updateSettingsState, brandTheme, updateBrandTheme } = useSettings();
  const [sshKeys, setSSHKeys] = useState<SSHKey[]>([]);
  const [keyName, setKeyName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();
  const locale = settings.language === "ru" ? "ru" : "en";

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
      push("success", locale === "ru" ? "Настройки сохранены" : "Settings saved");
    } catch (error) {
      push("error", error instanceof Error ? error.message : locale === "ru" ? "Не удалось сохранить настройки" : "Failed to save settings");
    } finally {
      setLoading(false);
    }
  }

  async function addSSHKey(event: FormEvent) {
    event.preventDefault();
    if (!keyValue.startsWith("ssh-")) {
      push("error", locale === "ru" ? "SSH key должен начинаться с ssh-rsa/ssh-ed25519" : "SSH key must start with ssh-rsa/ssh-ed25519");
      return;
    }
    setLoading(true);
    try {
      const created = await createSSHKey({ name: keyName || "Primary key", public_key: keyValue.trim() });
      setSSHKeys((prev) => [created, ...prev]);
      setKeyName("");
      setKeyValue("");
      push("success", locale === "ru" ? "SSH ключ добавлен" : "SSH key added");
    } catch (error) {
      push("error", error instanceof Error ? error.message : locale === "ru" ? "Не удалось добавить SSH ключ" : "Failed to add SSH key");
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
      push("info", locale === "ru" ? "SSH ключ удален" : "SSH key removed");
    } catch (error) {
      push("error", error instanceof Error ? error.message : locale === "ru" ? "Не удалось удалить SSH ключ" : "Failed to remove SSH key");
    } finally {
      setLoading(false);
    }
  }

  async function copySSHKey(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      push("success", locale === "ru" ? "SSH ключ скопирован" : "SSH key copied");
    } catch {
      push("error", locale === "ru" ? "Clipboard недоступен" : "Clipboard access is not available");
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader title={locale === "ru" ? "Settings" : "Settings"} description={locale === "ru" ? "RU/EN, тема, бренд, timezone и SSH ключи." : "RU/EN, theme, brand, timezone and SSH keys."} />
      <Card title={locale === "ru" ? "Personalization" : "Personalization"} description={locale === "ru" ? "Пользовательские настройки интерфейса." : "User interface preferences."}>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={saveSettings}>
          <Select
            label={locale === "ru" ? "Theme / Тема" : "Theme / Тема"}
            value={settings.theme}
            onChange={(event) => updateSettingsState({ theme: event.target.value })}
            options={[
              { value: "system", label: "System / Системная" },
              { value: "dark", label: "Dark / Темная" },
              { value: "light", label: "Light / Светлая" }
            ]}
          />
          <Select
            label={locale === "ru" ? "Language / Язык" : "Language / Язык"}
            value={settings.language}
            onChange={(event) => updateSettingsState({ language: event.target.value as "en" | "ru" })}
            options={[
              { value: "en", label: "English" },
              { value: "ru", label: "Русский" }
            ]}
          />
          <Input
            label={locale === "ru" ? "Timezone / Часовой пояс" : "Timezone / Часовой пояс"}
            value={settings.timezone}
            placeholder="Europe/Minsk"
            onChange={(event) => updateSettingsState({ timezone: event.target.value })}
          />
          <Select
            label={locale === "ru" ? "Brand theme / Бренд" : "Brand theme / Бренд"}
            value={brandTheme}
            onChange={(event) => updateBrandTheme(event.target.value as "mts" | "mono")}
            options={[
              { value: "mts", label: "MTS Red (default)" },
              { value: "mono", label: "Mono Red" }
            ]}
          />
          <div className="md:col-span-4">
            <Button type="submit" loading={loading}>{locale === "ru" ? "Сохранить настройки" : "Save settings"}</Button>
          </div>
        </form>
      </Card>

      <Card title={locale === "ru" ? "SSH keys CRUD" : "SSH keys CRUD"} description={locale === "ru" ? "Управление публичными SSH ключами." : "Public keys used to access rented servers and PODs."}>
        <div className="mb-3 rounded-md border border-border bg-canvas p-3 text-xs text-textSecondary">
          <p className="flex items-center gap-2 text-textPrimary"><Icon glyph={LuInfo} size={16} /> {locale === "ru" ? "Подсказка" : "Hint"}</p>
          <p className="mt-1">{locale === "ru" ? "Храните ключи по устройствам/командам и не вставляйте приватные ключи." : "Store keys per device/team and never paste private keys."}</p>
        </div>
        <form className="space-y-3" onSubmit={addSSHKey}>
          <Input label={locale === "ru" ? "Key name / Имя" : "Key name / Имя"} value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder={locale === "ru" ? "Рабочий ноутбук" : "Work laptop"} />
          <Textarea
            label={locale === "ru" ? "Public SSH key / Публичный ключ" : "Public SSH key / Публичный ключ"}
            value={keyValue}
            onChange={(event) => setKeyValue(event.target.value)}
            placeholder="ssh-ed25519 AAAA..."
            className="font-mono"
          />
          <Button type="submit" loading={loading}>{locale === "ru" ? "Добавить ключ" : "Add key"}</Button>
        </form>
        <div className="mt-4">
          <Table
            ariaLabel="User SSH keys"
            rowKey={(row) => row.id ?? row.name}
            items={sshKeys}
            emptyState={<EmptyState title={locale === "ru" ? "SSH ключи не добавлены" : "No SSH keys yet"} description={locale === "ru" ? "Добавьте минимум один ключ для доступа к машинам." : "Add at least one key to access machines."} />}
            columns={[
              { key: "name", header: locale === "ru" ? "Имя" : "Name", render: (row) => row.name },
              {
                key: "key",
                header: locale === "ru" ? "Ключ" : "Key",
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{truncateSSHKey(row.public_key)}</span>
                    <Button variant="ghost" size="sm" onClick={() => copySSHKey(row.public_key)}>
                      {locale === "ru" ? "Копировать" : "Copy"}
                    </Button>
                  </div>
                )
              },
              { key: "created", header: locale === "ru" ? "Создан" : "Created", render: (row) => (row.created_at ? new Date(row.created_at).toLocaleString() : "-") },
              { key: "actions", header: locale === "ru" ? "Действия" : "Actions", render: (row) => <Button variant="ghost" size="sm" onClick={() => removeSSHKey(row.id)}>{locale === "ru" ? "Удалить" : "Delete"}</Button> }
            ]}
          />
        </div>
      </Card>
    </section>
  );
}
