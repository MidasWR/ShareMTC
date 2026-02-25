import { cx } from "../../design/utils/cx";
import { AppTab } from "./menu";
import { useTranslation } from "../i18n";
import { FaSignOutAlt } from "react-icons/fa";
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
  const accountItems = enabledMenu.filter((entry) => entry.group === "account");

  return (
    <aside className="border-b border-border bg-surface flex flex-col h-full lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="p-4 lg:p-5">
        <div className="flex items-center gap-2">
          <img src="/logo-sharemtc.svg" alt="ShareMTC logo" className="h-6 w-6" />
          <h1 className="text-lg font-semibold text-brand">{t.sidebar.title}</h1>
        </div>
        <p className="mt-1 text-xs text-textSecondary">{t.sidebar.subtitle}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 lg:px-5 space-y-1" aria-label="Primary navigation">
        <p className="mb-1 text-[11px] uppercase tracking-wider text-textMuted">Product areas</p>
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
                  ? "rounded-l-none border-l-2 border-brand bg-brand/10 font-medium text-brand shadow-brand"
                  : "text-textSecondary hover:text-textPrimary hover:bg-elevated"
              )}
              aria-current={tab === item.id ? "page" : undefined}
            >
              {ItemIcon ? <ItemIcon className="mr-2 opacity-80" /> : null}
              {t.menu[item.id] || item.label}
            </button>
          );
        })}
        {accountItems.length > 0 ? <p className="mb-1 mt-4 text-[11px] uppercase tracking-wider text-textMuted">Account</p> : null}
        {accountItems.map((item) => {
          const ItemIcon = tabIcons[item.id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cx(
                "focus-ring flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                tab === item.id
                  ? "rounded-l-none border-l-2 border-brand bg-brand/10 font-medium text-brand shadow-brand"
                  : "text-textSecondary hover:bg-elevated hover:text-textPrimary"
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
