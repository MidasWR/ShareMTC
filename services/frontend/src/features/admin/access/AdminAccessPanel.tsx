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
      push("success", "Admin access granted");
      onSuccess();
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Access denied");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Direct /admin Access"
        description="Sign in with admin credentials for privileged admin workflows."
      />
      <Card title="Administrator Login" description="This login flow is dedicated to admin module access.">
        <form className="space-y-3" onSubmit={submit}>
          <Input label="Username" value={username} onChange={(event) => setUsername(event.target.value)} />
          <Input label="Access key" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button type="submit" loading={loading}>Enter /admin</Button>
        </form>
      </Card>
    </section>
  );
}
