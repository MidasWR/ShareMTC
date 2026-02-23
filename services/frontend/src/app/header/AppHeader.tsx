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
          <Breadcrumbs items={[{ id: "home", label: "Панель управления" }, { id: tab, label: activeLabel }]} />
          <div>
            <h2 className="text-xl font-semibold">{activeLabel}</h2>
            <p className="text-sm text-textSecondary">Профессиональный интерфейс управления вычислениями, арендой и админ-процессами.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-md border border-border px-2 py-1 text-xs text-textSecondary lg:inline-flex">
            <span className="health-pulse" />
            Система в норме
          </span>
          <Button onClick={() => onNavigate("podsCatalog")} aria-label="Открыть каталог pods">
            Выбрать Pod
          </Button>
          <Button variant="secondary" onClick={onShortcuts} aria-label="Открыть клавиатурные сокращения">
            Шорткаты
          </Button>
          <Button variant="ghost" onClick={onLogout} aria-label="Выйти">
            Выйти
          </Button>
        </div>
      </div>
    </header>
  );
}
