import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { getUserSettings } from "../../features/auth/api/authApi";
import { UserSettings } from "../../types/api";

type SettingsContextType = {
  settings: UserSettings;
  updateSettingsState: (partial: Partial<UserSettings>) => void;
};

const defaultSettings: UserSettings = {
  theme: "dark",
  language: "en",
  timezone: "UTC"
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);

  useEffect(() => {
    async function load() {
      try {
        const s = await getUserSettings();
        if (s) {
          setSettings((prev) => ({ ...prev, ...s }));
        }
      } catch (e) {
        // Ignored, user might not be logged in yet
      }
    }
    load();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark" || (settings.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.setAttribute("lang", settings.language);
  }, [settings.theme, settings.language]);

  function updateSettingsState(partial: Partial<UserSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettingsState }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}
