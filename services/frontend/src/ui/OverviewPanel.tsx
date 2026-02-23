import { MetricTile } from "../design/patterns/MetricTile";
import { PageSectionHeader } from "../design/patterns/PageSectionHeader";
import { Card } from "../design/primitives/Card";

export function OverviewPanel() {
  return (
    <section className="section-stack">
      <PageSectionHeader
        title="Обзор"
        description="Быстрая ориентация по сценариям аренды, шеринга и администрирования."
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Контур аренды" value="Pods" hint="Выбор -> Запуск -> Завершение" />
        <MetricTile label="Контур провайдера" value="Nodes" hint="Подключение -> Heartbeat" />
        <MetricTile label="Контур биллинга" value="Finance" hint="Использование -> Начисление" />
        <MetricTile label="Контур админа" value="Audit" hint="Управление рисками и доступом" />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <Card title="Активность" description="Последние действия в системе">
          <div className="text-sm text-textSecondary h-32 flex items-center justify-center font-mono">
            Нет недавней активности
          </div>
        </Card>
        <Card title="Статус серверов" description="Доступность инфраструктуры">
          <div className="text-sm text-textSecondary h-32 flex items-center justify-center font-mono">
            Все системы работают штатно
          </div>
        </Card>
      </div>
    </section>
  );
}
