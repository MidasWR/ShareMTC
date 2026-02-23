import { cx } from "../../design/utils/cx";
import { AppTab, NavGroup } from "./menu";
import { useTranslation } from "../i18n";
import { FaSignOutAlt, FaCog, FaChevronDown } from "react-icons/fa";
import { IconType } from "react-icons";
import {
  FaCubes,
  FaServer,
  FaShareAlt,
  FaChartLine,
  FaMoneyBillWave,
  FaCloud,
  FaUsersCog,
  FaShieldAlt,
  FaRobot
} from "react-icons/fa";

const tabIcons: Record<AppTab, IconType> = {
  myTemplates: FaCubes,
  vm: FaServer,
  sharedVm: FaShareAlt,
  pods: FaServer,
  sharedPods: FaShareAlt,
  k8sClusters: FaCloud,
  myServers: FaServer,
  coreDashboard: FaChartLine,
  billing: FaMoneyBillWave,
  settings: FaCog,
  providerDashboard: FaChartLine,
  agentOnboarding: FaRobot,
  adminAccess: FaShieldAlt,
  adminDashboard: FaChartLine,
  adminServers: FaUsersCog,
  adminSharing: FaShareAlt,
  vip: FaShieldAlt
};

type Props = {
  tab: AppTab;
  groups: NavGroup[];
  enabledMenu: Array<{ id: AppTab; label: string; group: NavGroup }>;
  onNavigate: (tab: AppTab) => void;
  onLogout: () => void;
  onShortcuts: () => void;
};

export function SidebarNav({ tab, groups, enabledMenu, onNavigate, onLogout, onShortcuts }: Props) {
  const t = useTranslation();
  const groupLabel: Record<NavGroup, string> = {
    core: "Manage",
    provider: "Resources",
    admin: "Administration",
    ops: "Account"
  };

  return (
    <aside className="border-b border-border bg-surface flex flex-col h-full lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="p-4 lg:p-5">
        <h1 className="text-lg font-semibold neon-text">{t.sidebar.title}</h1>
        <p className="mt-1 text-xs text-textSecondary">{t.sidebar.subtitle}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 lg:px-5 space-y-4" aria-label="Primary navigation">
        {groups.map((group) => {
          const items = enabledMenu.filter((entry) => entry.group === group && entry.id !== "settings");
          if (items.length === 0) return null;
          return (
            <details key={group} className="group" open>
              <summary className="flex cursor-pointer items-center justify-between px-2 py-1 text-xs uppercase tracking-wide text-textMuted hover:text-textPrimary transition-colors outline-none focus-visible:ring-1 focus-visible:ring-brand rounded">
                <span>{groupLabel[group] || t.sidebar[group]}</span>
                <FaChevronDown className="transition-transform group-open:rotate-180 opacity-50" />
              </summary>
              <div className="mt-2 space-y-1">
                {items.map((item) => {
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
              </div>
            </details>
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
