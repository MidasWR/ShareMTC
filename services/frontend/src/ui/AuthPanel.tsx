import { FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FcGoogle } from "react-icons/fc";
import { useToast } from "../design/components/Toast";
import { Button } from "../design/primitives/Button";
import { Card } from "../design/primitives/Card";
import { Input } from "../design/primitives/Input";
import { InlineAlert } from "../design/patterns/InlineAlert";
import { API_BASE } from "../config/apiBase";
import { setSession } from "../lib/auth";
import { fetchJSON } from "../lib/http";

type AuthPanelProps = {
  onAuthenticated?: () => void;
};

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"" | "register" | "login">("");
  const [error, setError] = useState("");
  const { push } = useToast();

  const emailError = useMemo(() => {
    if (!email) return "Email is required";
    if (!email.includes("@")) return "Email must contain @";
    return "";
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must contain at least 8 characters";
    return "";
  }, [password]);

  async function submit(path: "register" | "login", e: FormEvent) {
    e.preventDefault();
    if (emailError || passwordError) {
      setError("Fix form errors before submitting");
      return;
    }
    setError("");
    setLoading(path);
    try {
      const json = await fetchJSON<{ token: string; user: { id: string; email: string; role: string } }>(`${API_BASE.auth}/v1/auth/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      setSession(json.token, json.user);
      onAuthenticated?.();
      push("success", `Signed in as ${json.user.email}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request error");
      push("error", "Authentication failed");
    } finally {
      setLoading("");
    }
  }

  async function login() {
    if (emailError || passwordError) {
      setError("Fix form errors before submitting");
      return;
    }
    setError("");
    setLoading("login");
    try {
      const json = await fetchJSON<{ token: string; user: { id: string; email: string; role: string } }>(`${API_BASE.auth}/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      setSession(json.token, json.user);
      onAuthenticated?.();
      push("success", `Signed in as ${json.user.email}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request error");
      push("error", "Authentication failed");
    } finally {
      setLoading("");
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl">
      <Card
        title="Platform Access"
        description="Sign in or register with smooth mode switching."
      >
        <div className="mb-4 inline-flex rounded-md border border-border p-1">
          <button
            type="button"
            className={`rounded px-3 py-1 text-sm ${mode === "login" ? "bg-brand text-white" : "text-textSecondary"}`}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1 text-sm ${mode === "register" ? "bg-brand text-white" : "text-textSecondary"}`}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <form className="space-y-3" onSubmit={(e) => submit(mode, e)}>
              <Input label="Email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} error={email ? emailError : ""} />
              <Input
                label="Password"
                placeholder="Minimum 8 characters"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={password ? passwordError : ""}
              />
              {error ? <InlineAlert kind="error">{error}</InlineAlert> : null}
              <Button type="submit" className="w-full" loading={loading === mode}>
                {mode === "login" ? "Sign in with email" : "Create account"}
              </Button>
            </form>
          </motion.div>
        </AnimatePresence>
        <div className="mt-3 space-y-2">
          <Button variant="secondary" className="w-full" onClick={login} loading={loading === "login"}>
            Quick sign in
          </Button>
          <a
            className="focus-ring inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-elevated text-sm font-medium text-textPrimary hover:bg-slate-700/40 transition-colors"
            href={`${API_BASE.auth}/v1/auth/google/start`}
          >
            <FcGoogle size={18} />
            Continue with Google
          </a>
        </div>
      </Card>
    </section>
  );
}
