import { FormEvent, useState } from "react";

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE_URL ?? "http://localhost:8081";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<string>("");

  async function submit(path: "register" | "login", e: FormEvent) {
    e.preventDefault();
    const response = await fetch(`${AUTH_BASE}/v1/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const json = await response.json();
    if (!response.ok) {
      setResult(json.error ?? "request failed");
      return;
    }
    localStorage.setItem("host_token", json.token);
    setResult(`Success for ${json.user.email}`);
  }

  async function login() {
    const response = await fetch(`${AUTH_BASE}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const json = await response.json();
    if (!response.ok) {
      setResult(json.error ?? "request failed");
      return;
    }
    localStorage.setItem("host_token", json.token);
    setResult(`Success for ${json.user.email}`);
  }

  return (
    <section className="grid md:grid-cols-2 gap-6">
      <form className="glass p-6 space-y-4" onSubmit={(e) => submit("register", e)}>
        <h2 className="text-xl font-semibold">Email Registration</h2>
        <input
          className="w-full rounded bg-slate-900 border border-slate-700 p-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
        />
        <input
          className="w-full rounded bg-slate-900 border border-slate-700 p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          type="password"
        />
        <button className="w-full bg-accent py-3 rounded font-semibold">Register</button>
      </form>

      <div className="glass p-6 space-y-4">
        <h2 className="text-xl font-semibold">Login / OAuth2</h2>
        <button className="w-full bg-slate-700 py-3 rounded" onClick={login}>
          Login with Email
        </button>
        <a
          className="block text-center w-full bg-red-600 py-3 rounded font-semibold"
          href={`${AUTH_BASE}/v1/auth/google/start`}
        >
          Continue with Google
        </a>
        <p className="text-sm text-slate-300">Result: {result || "no actions yet"}</p>
      </div>
    </section>
  );
}
