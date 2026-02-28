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

const PREFILL_ADMIN_USERNAME = import.meta.env.VITE_ADMIN_PREFILL_USERNAME ?? "admin";
const PREFILL_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PREFILL_PASSWORD ?? "admin";

export function AdminAccessPanel({ onSuccess }: Props) {
  const [username, setUsername] = useState(PREFILL_ADMIN_USERNAME);
  const [password, setPassword] = useState(PREFILL_ADMIN_PASSWORD);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  async function submitCredentials() {
    if (!username.trim() || !password.trim()) {
      push("error", "Username and access key are required");
      return;
    }
    setLoading(true);
    try {
      const response = await loginDirectAdmin(username, password);
      setSession(response.token, response.user);
      push("success", "Admin access granted");
      onSuccess();
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Access denied");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await submitCredentials();
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Direct /admin Access"
        description="Use dedicated administrator credentials and press Enter /admin to continue."
      />
      <Card title="Administrator Login" description="This login flow is dedicated to admin module access.">
        <form className="space-y-3" onSubmit={submit}>
          <Input label="Username" value={username} onChange={(event) => setUsername(event.target.value)} />
          <Input label="Access key" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={loading}>Enter /admin</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
