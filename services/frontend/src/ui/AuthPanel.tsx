import { FormEvent, useMemo, useState } from "react";
import { useToast } from "../design/components/Toast";
import { Button } from "../design/primitives/Button";
import { Card } from "../design/primitives/Card";
import { Input } from "../design/primitives/Input";
import { fetchJSON } from "../lib/http";

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE_URL ?? "http://localhost:8081";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"" | "register" | "login">("");
  const [error, setError] = useState("");
  const { push } = useToast();

  const emailError = useMemo(() => {
    if (!email) return "Email is required";
    if (!email.includes("@")) return "Email should contain @";
    return "";
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    return "";
  }, [password]);

  async function submit(path: "register" | "login", e: FormEvent) {
    e.preventDefault();
    if (emailError || passwordError) {
      setError("Please fix form errors before submitting");
      return;
    }
    setError("");
    setLoading(path);
    try {
      const json = await fetchJSON<{ token: string; user: { email: string } }>(`${AUTH_BASE}/v1/auth/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem("host_token", json.token);
      push("success", `Authenticated as ${json.user.email}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed");
      push("error", "Authentication failed");
    } finally {
      setLoading("");
    }
  }

  async function login() {
    if (emailError || passwordError) {
      setError("Please fix form errors before submitting");
      return;
    }
    setError("");
    setLoading("login");
    try {
      const json = await fetchJSON<{ token: string; user: { email: string } }>(`${AUTH_BASE}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      localStorage.setItem("host_token", json.token);
      push("success", `Authenticated as ${json.user.email}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed");
      push("error", "Authentication failed");
    } finally {
      setLoading("");
    }
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <Card title="Email Registration" description="Create account and receive JWT token in local storage.">
        <form className="space-y-3" onSubmit={(e) => submit("register", e)}>
          <Input label="Email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={email ? emailError : ""} />
          <Input
            label="Password"
            placeholder="At least 8 characters"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={password ? passwordError : ""}
          />
          {error ? <p role="alert" className="rounded-md border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">{error}</p> : null}
          <Button type="submit" className="w-full" loading={loading === "register"}>
            Register
          </Button>
        </form>
      </Card>

      <Card title="Login & OAuth2" description="Use existing credentials or federated login.">
        <div className="space-y-3">
          <Button variant="secondary" className="w-full" onClick={login} loading={loading === "login"}>
            Login with email
          </Button>
          <a
            className="focus-ring inline-flex h-10 w-full items-center justify-center rounded-md border border-border bg-elevated text-sm font-medium text-textPrimary hover:bg-slate-700/40"
            href={`${AUTH_BASE}/v1/auth/google/start`}
          >
            Continue with Google
          </a>
          <p className="text-xs text-textMuted">Consumer and provider identity share the same auth surface.</p>
        </div>
      </Card>
    </section>
  );
}
