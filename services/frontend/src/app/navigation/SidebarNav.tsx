import { cx } from "../../design/utils/cx";
import { AppTab, NavGroup } from "./menu";

type Props = {
  tab: AppTab;
  groups: NavGroup[];
  enabledMenu: Array<{ id: AppTab; label: string; group: NavGroup }>;
  onNavigate: (tab: AppTab) => void;
};

const groupLabels: Record<NavGroup, string> = {
  core: "Core",
  provider: "Provider",
  admin: "Admin",
  ops: "Operations"
};

export function SidebarNav({ tab, groups, enabledMenu, onNavigate }: Props) {
  return (
    <aside className="border-b border-border bg-surface px-4 py-4 lg:min-h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <h1 className="text-lg font-semibold">ShareMTC Control Plane</h1>
      <p className="mt-1 text-xs text-textSecondary">Pods-as-a-Service + Marketplace Compute</p>
      <nav className="mt-6 space-y-5" aria-label="Primary navigation">
        {groups.map((group) => {
          const items = enabledMenu.filter((entry) => entry.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="space-y-1">
              <p className="px-2 text-xs uppercase tracking-wide text-textMuted">{groupLabels[group]}</p>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={cx(
                    "focus-ring flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    tab === item.id ? "bg-brand text-white" : "text-textSecondary hover:bg-elevated hover:text-textPrimary"
                  )}
                  aria-current={tab === item.id ? "page" : undefined}
                >
                  {item.label}
                </button>
              ))}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
