import { Breadcrumbs } from "../../design/patterns/Breadcrumbs";
import { Button } from "../../design/primitives/Button";
import { AppTab } from "../navigation/menu";

type Props = {
  tab: AppTab;
  activeLabel: string;
  onNavigate: (tab: AppTab) => void;
  onShortcuts: () => void;
  onLogout: () => void;
};

export function AppHeader({ tab, activeLabel, onNavigate, onShortcuts, onLogout }: Props) {
  return (
    <header className="glass p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Breadcrumbs items={[{ id: "home", label: "Control Plane" }, { id: tab, label: activeLabel }]} />
          <div>
            <h2 className="text-xl font-semibold">{activeLabel}</h2>
            <p className="text-sm text-textSecondary">Operational UI with role-based access, data-dense controls, and contract-safe integrations.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => onNavigate("pods")} aria-label="Open pods and allocations section">
            Create pod
          </Button>
          <Button variant="secondary" onClick={onShortcuts} aria-label="Open keyboard shortcuts">
            Shortcuts
          </Button>
          <Button variant="ghost" onClick={onLogout} aria-label="Sign out">
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
