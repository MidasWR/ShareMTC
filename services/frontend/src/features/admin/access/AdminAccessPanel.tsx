import { FormEvent, useState } from "react";
import { loginDirectAdmin } from "../../auth/api/authApi";
import { setSession } from "../../../lib/auth";
import { useToast } from "../../../design/components/Toast";
import { PageSectionHeader } from "../../../design/patterns/PageSectionHeader";
import { Card } from "../../../design/primitives/Card";
import { Input } from "../../../design/primitives/Input";
import { Button } from "../../../design/primitives/Button";

type Props = {
  onSuccess: () => void;
};

export function AdminAccessPanel({ onSuccess }: Props) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await loginDirectAdmin(username, password);
      setSession(response.token, response.user);
      push("success", "Доступ в /admin выдан");
      onSuccess();
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Доступ запрещен");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Прямой доступ в /admin"
        description="Вход по ключу доступа admin/admin123 с журналированием попыток."
      />
      <Card title="Авторизация администратора" description="Данный способ доступа предназначен для админ-модуля.">
        <form className="space-y-3" onSubmit={submit}>
          <Input label="Логин" value={username} onChange={(event) => setUsername(event.target.value)} />
          <Input label="Ключ доступа" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button type="submit" loading={loading}>Войти в /admin</Button>
        </form>
      </Card>
    </section>
  );
}
