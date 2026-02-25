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

const ENABLE_ADMIN_QUICK_ACCESS = import.meta.env.VITE_ENABLE_ADMIN_QUICK_ACCESS === "true";

export function AdminAccessPanel({ onSuccess }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
        description="Use dedicated administrator credentials. This form never auto-fills secrets by default."
      />
      <Card title="Administrator Login" description="This login flow is dedicated to admin module access.">
        <form className="space-y-3" onSubmit={submit}>
          <Input label="Username" value={username} onChange={(event) => setUsername(event.target.value)} />
          <Input label="Access key" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={loading}>Enter /admin</Button>
            {ENABLE_ADMIN_QUICK_ACCESS ? (
              <Button
                type="button"
                variant="secondary"
                loading={loading}
                onClick={() => {
                  setUsername("admin");
                  setPassword("admin");
                }}
              >
                Fill demo credentials
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    </section>
  );
}
