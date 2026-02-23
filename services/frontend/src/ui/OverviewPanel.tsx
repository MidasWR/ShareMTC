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

      <Card title="Сводка платформы" description="Ключевые контуры работы GPU Pods и вычислительного маркетплейса.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Контур аренды" value="Выбор -> Запуск -> Завершение" hint="Жизненный цикл pod/сервера" />
          <MetricTile label="Контур провайдера" value="Подключение -> Heartbeat" hint="Состояние и доступность нод" />
          <MetricTile label="Контур биллинга" value="Использование -> Начисление" hint="Почасовой и помесячный режим" />
          <MetricTile label="Контур админа" value="Аудит и контроль" hint="Управление рисками и доступом" />
        </div>
      </Card>
    </section>
  );
}
