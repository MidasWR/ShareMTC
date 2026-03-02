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
const PREFILL_ADMIN_USERNAME = import.meta.env.VITE_ADMIN_PREFILL_USERNAME ?? "admin";
const PREFILL_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PREFILL_PASSWORD ?? "admin123";

export function AdminAccessPanel({ onSuccess }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  function fillQuickAccess() {
    setUsername(PREFILL_ADMIN_USERNAME);
    setPassword(PREFILL_ADMIN_PASSWORD);
  }

  async function submitCredentials() {
    const nextErrors: { username?: string; password?: string } = {};
    if (!username.trim()) nextErrors.username = "Username is required";
    if (!password.trim()) nextErrors.password = "Access key is required";
    setErrors(nextErrors);
    if (nextErrors.username || nextErrors.password) {
      push("error", "Username and access key are required", "/admin");
      return;
    }
    setLoading(true);
    try {
      const response = await loginDirectAdmin(username, password);
      setSession(response.token, response.user);
      push("success", "Admin access granted", "/admin");
      onSuccess();
    } catch (error) {
      push("error", error instanceof Error ? error.message : "Access denied", "/admin");
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
        <form className="space-y-3" onSubmit={submit} noValidate>
          <Input label="Username" required error={errors.username} value={username} onChange={(event) => setUsername(event.target.value)} />
          <Input label="Access key" required error={errors.password} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={loading}>Enter /admin</Button>
            {ENABLE_ADMIN_QUICK_ACCESS ? (
              <Button type="button" variant="secondary" onClick={fillQuickAccess}>
                Quick access
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    </section>
  );
}
