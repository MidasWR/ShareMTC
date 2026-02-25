import { FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FcGoogle } from "react-icons/fc";
import { LuEye, LuEyeOff, LuSparkles } from "react-icons/lu";
import { useSettings } from "../app/providers/SettingsProvider";
import { useToast } from "../design/components/Toast";
import { Button } from "../design/primitives/Button";
import { Card } from "../design/primitives/Card";
import { Icon } from "../design/primitives/Icon";
import { Input } from "../design/primitives/Input";
import { InlineAlert } from "../design/patterns/InlineAlert";
import { API_BASE } from "../config/apiBase";
import { setSession } from "../lib/auth";
import { fetchJSON } from "../lib/http";

type AuthPanelProps = {
  onAuthenticated?: () => void;
};

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const { settings } = useSettings();
  const locale = settings.language === "ru" ? "ru" : "en";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"" | "register" | "login">("");
  const [error, setError] = useState("");
  const { push } = useToast();

  const emailError = useMemo(() => {
    if (!email) return locale === "ru" ? "Email обязателен" : "Email is required";
    if (!email.includes("@")) return locale === "ru" ? "Email должен содержать @" : "Email must contain @";
    return "";
  }, [email, locale]);

  const passwordError = useMemo(() => {
    if (!password) return locale === "ru" ? "Пароль обязателен" : "Password is required";
    if (password.length < 8) return locale === "ru" ? "Минимум 8 символов" : "Password must contain at least 8 characters";
    return "";
  }, [password, locale]);

  const passwordChecks = useMemo(
    () => [
      { label: locale === "ru" ? "Минимум 8 символов" : "At least 8 characters", ok: password.length >= 8 },
      { label: locale === "ru" ? "Есть буква" : "Contains a letter", ok: /[A-Za-zА-Яа-я]/.test(password) },
      { label: locale === "ru" ? "Есть цифра" : "Contains a number", ok: /\d/.test(password) }
    ],
    [locale, password]
  );

  function normalizeAuthError(raw: unknown, path: "register" | "login"): string {
    const message = raw instanceof Error ? raw.message : locale === "ru" ? "Ошибка запроса" : "Request error";
    const lower = message.toLowerCase();
    if (lower.includes("email already exists") || lower.includes("users_email_key") || lower.includes("duplicate key")) {
      return locale === "ru" ? "Email уже зарегистрирован. Используйте вход." : "Email is already registered. Use Sign in.";
    }
    if (path === "login" && lower.includes("user not found")) {
      return locale === "ru" ? "Аккаунт не найден. Сначала зарегистрируйтесь." : "Account not found. Try Register first.";
    }
    return message;
  }

  async function submit(path: "register" | "login", e: FormEvent) {
    e.preventDefault();
    if (emailError || passwordError) {
      setError(locale === "ru" ? "Исправьте ошибки формы" : "Fix form errors before submitting");
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
      push("success", locale === "ru" ? `Вход выполнен: ${json.user.email}` : `Signed in as ${json.user.email}`);
    } catch (requestError) {
      setError(normalizeAuthError(requestError, path));
      push("error", locale === "ru" ? "Ошибка аутентификации" : "Authentication failed");
    } finally {
      setLoading("");
    }
  }

  async function login() {
    if (emailError || passwordError) {
      setError(locale === "ru" ? "Исправьте ошибки формы" : "Fix form errors before submitting");
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
      push("success", locale === "ru" ? `Вход выполнен: ${json.user.email}` : `Signed in as ${json.user.email}`);
    } catch (requestError) {
      setError(normalizeAuthError(requestError, "login"));
      push("error", locale === "ru" ? "Ошибка аутентификации" : "Authentication failed");
    } finally {
      setLoading("");
    }
  }

  return (
    <section className="mx-auto w-full max-w-xl">
      <Card
        title={locale === "ru" ? "Доступ к платформе" : "Platform Access"}
        description={locale === "ru" ? "Compute-marketplace для запуска и управления AI/GPU инстансами." : "Compute marketplace to deploy and operate AI/GPU instances."}
      >
        <div className="mb-4 rounded-md border border-border bg-canvas p-3 text-sm text-textSecondary">
          <p className="flex items-center gap-2 font-medium text-textPrimary"><Icon glyph={LuSparkles} size={16} /> {locale === "ru" ? "Что это за платформа" : "What is this platform"}</p>
          <p className="mt-1">{locale === "ru" ? "ShareMTC/MTS Space помогает выбрать GPU в каталоге, задеплоить инстанс через wizard и управлять lifecycle в единой консоли." : "ShareMTC/MTS Space helps you choose GPUs, deploy via wizard and manage lifecycle in one console."}</p>
        </div>
        <div className="mb-4 inline-flex rounded-md border border-border p-1">
          <button
            type="button"
            className={`rounded px-3 py-1 text-sm ${mode === "login" ? "bg-brand text-white" : "text-textSecondary"}`}
            onClick={() => setMode("login")}
          >
            {locale === "ru" ? "Вход" : "Sign in"}
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1 text-sm ${mode === "register" ? "bg-brand text-white" : "text-textSecondary"}`}
            onClick={() => setMode("register")}
          >
            {locale === "ru" ? "Регистрация" : "Register"}
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
                label={locale === "ru" ? "Пароль" : "Password"}
                placeholder={locale === "ru" ? "Минимум 8 символов" : "Minimum 8 characters"}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={password ? passwordError : ""}
                rightSlot={
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={showPassword ? (locale === "ru" ? "Скрыть пароль" : "Hide password") : (locale === "ru" ? "Показать пароль" : "Show password")}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    <Icon glyph={showPassword ? LuEyeOff : LuEye} size={16} />
                  </Button>
                }
              />
              <ul className="rounded-md border border-border bg-canvas p-2 text-xs text-textSecondary">
                {passwordChecks.map((check) => (
                  <li key={check.label} className={check.ok ? "text-success" : "text-textMuted"}>- {check.label}</li>
                ))}
              </ul>
              {error ? <InlineAlert kind="error">{error}</InlineAlert> : null}
              <Button type="submit" className="w-full" loading={loading === mode}>
                {mode === "login" ? (locale === "ru" ? "Войти по email" : "Sign in with email") : (locale === "ru" ? "Создать аккаунт" : "Create account")}
              </Button>
            </form>
          </motion.div>
        </AnimatePresence>
        <div className="mt-3 space-y-2">
          <Button variant="secondary" className="w-full" onClick={login} loading={loading === "login"}>
            {locale === "ru" ? "Быстрый вход" : "Quick sign in"}
          </Button>
          <a
            className="focus-ring inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-elevated text-sm font-medium text-textPrimary hover:bg-slate-700/40 transition-colors"
            href={`${API_BASE.auth}/v1/auth/google/start`}
          >
            <FcGoogle size={18} />
            {locale === "ru" ? "Продолжить через Google" : "Continue with Google"}
          </a>
          <Button variant="ghost" className="w-full">
            {locale === "ru" ? "Создать первый инстанс" : "Create first instance"}
          </Button>
        </div>
      </Card>
    </section>
  );
}
