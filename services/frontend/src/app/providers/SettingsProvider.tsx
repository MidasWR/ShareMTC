import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { getUserSettings } from "../../features/auth/api/authApi";
import { featureFlags } from "../../config/featureFlags";
import { UserSettings } from "../../types/api";

export type BrandTheme = "mts" | "mono";

type SettingsContextType = {
  settings: UserSettings;
  updateSettingsState: (partial: Partial<UserSettings>) => void;
  brandTheme: BrandTheme;
  updateBrandTheme: (next: BrandTheme) => void;
};

const defaultSettings: UserSettings = {
  theme: "dark",
  language: "en",
  timezone: "UTC"
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [brandTheme, setBrandTheme] = useState<BrandTheme>(() => {
    const saved = window.localStorage.getItem("brandTheme");
    if (saved === "mono" || saved === "mts") return saved;
    return featureFlags.defaultBrandTheme;
  });

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

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-brand-theme", brandTheme);
    window.localStorage.setItem("brandTheme", brandTheme);
  }, [brandTheme]);

  function updateSettingsState(partial: Partial<UserSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
  }

  function updateBrandTheme(next: BrandTheme) {
    setBrandTheme(next);
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettingsState, brandTheme, updateBrandTheme }}>
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
