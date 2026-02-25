import { cx } from "../../design/utils/cx";
import { AppTab } from "./menu";
import { useTranslation } from "../i18n";
import { FaSignOutAlt, FaCog } from "react-icons/fa";
import { IconType } from "react-icons";
import { FaStore, FaServer, FaUpload, FaMoneyBillWave, FaUsersCog, FaSlidersH } from "react-icons/fa";

const tabIcons: Record<AppTab, IconType> = {
  marketplace: FaStore,
  myCompute: FaServer,
  provideCompute: FaUpload,
  billing: FaMoneyBillWave,
  admin: FaUsersCog,
  settings: FaSlidersH
};

type Props = {
  tab: AppTab;
  enabledMenu: Array<{ id: AppTab; label: string; group: "main" | "account" }>;
  onNavigate: (tab: AppTab) => void;
  onLogout: () => void;
  onShortcuts: () => void;
};

export function SidebarNav({ tab, enabledMenu, onNavigate, onLogout, onShortcuts }: Props) {
  const t = useTranslation();
  const mainItems = enabledMenu.filter((entry) => entry.group === "main");

  return (
    <aside className="border-b border-border bg-surface flex flex-col h-full lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="p-4 lg:p-5">
        <div className="flex items-center gap-2">
          <img src="/logo-sharemtc.svg" alt="ShareMTC logo" className="h-6 w-6" />
          <h1 className="text-lg font-semibold neon-text">{t.sidebar.title}</h1>
        </div>
        <p className="mt-1 text-xs text-textSecondary">{t.sidebar.subtitle}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 lg:px-5 space-y-1" aria-label="Primary navigation">
        {mainItems.map((item) => {
          const ItemIcon = tabIcons[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cx(
                "focus-ring flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                tab === item.id
                  ? "border-l-2 border-brand text-brand bg-brand/10 shadow-[inset_2px_0_10px_rgba(0,255,65,0.2)] rounded-l-none font-medium"
                  : "text-textSecondary hover:text-textPrimary hover:bg-elevated"
              )}
              aria-current={tab === item.id ? "page" : undefined}
            >
              {ItemIcon ? <ItemIcon className="mr-2 opacity-80" /> : null}
              {t.menu[item.id] || item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 lg:p-5 border-t border-border mt-auto space-y-2">
        <button
          type="button"
          onClick={onShortcuts}
          className="focus-ring flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors text-textSecondary hover:bg-elevated hover:text-textPrimary"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded border border-border text-[10px] text-textMuted">?</span>
          {t.sidebar.shortcuts || "Shortcuts"}
        </button>

        <button
          type="button"
          onClick={() => onNavigate("settings")}
          className={cx(
            "focus-ring flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
            tab === "settings"
              ? "border-l-2 border-brand text-brand bg-brand/10 shadow-[inset_2px_0_10px_rgba(0,255,65,0.2)] rounded-l-none font-medium"
              : "text-textSecondary hover:text-textPrimary hover:bg-elevated"
          )}
        >
          <FaCog className={tab === "settings" ? "text-brand" : "text-textMuted"} />
          {t.sidebar.settings}
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="focus-ring flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors text-danger hover:bg-danger/10 hover:text-red-400"
        >
          <FaSignOutAlt className="opacity-80" />
          {t.sidebar.logout}
        </button>
      </div>
    </aside>
  );
}
