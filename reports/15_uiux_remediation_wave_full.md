# 15 UI/UX Remediation Wave (Full)

## Что было сделано

- Закрыт trust-дефект в Marketplace: поле имени инстанса теперь реально участвует в заказе.
  - Backend: в `billingservice` добавлено поле `name` в `ServerOrder`, migration fallback `ALTER TABLE ... ADD COLUMN IF NOT EXISTS name`, обновлены `INSERT/SELECT/Scan`.
  - Frontend: `ServerOrder` тип обновлен, `Marketplace` и `ServerRental` отправляют/показывают `name`.
- Доработана доступность:
  - Toast/InlineAlert разделяют `error -> role=alert aria-live=assertive` и `info/success -> role=status aria-live=polite`.
  - Унифицирован focus для checkbox/details summary через системные классы (`checkbox-control`, `details-summary-focus`).
  - Добавлен `prefers-reduced-motion` override.
  - Tabs получили стабильные `id` + `aria-controls`, панельные контейнеры — `role=tabpanel` и `aria-labelledby`.
- Улучшены формы и предотвращение ошибок:
  - Валидация server order возвращает ошибки по полям, а не только одну строку.
  - Поля Deploy-форм в Marketplace/ServerRental подсвечивают конкретные ошибки.
  - VM create: template выбирается через `Select`, добавлена более понятная модель единиц RAM (GB в UI, конвертация в MB на отправке).
- Приведена визуальная консистентность:
  - `Input/Textarea/Table/Card/Toast/Modal/Drawer` согласованы по форме/контролам.
  - Из `Table` убран принудительный `font-mono` для всех ячеек (оставлен opt-in в конкретных колонках).
- Перекомпонована зона действий в `My Instances`:
  - Линковка VM вынесена из перегруженной ячейки в явный `Link VM...` flow с модалкой.
  - Добавлен единый `DataFreshnessBadge`.
- Добавлена мобильная навигация:
  - В `AppShell` появился `Menu` + `Drawer` с реиспользованием `SidebarNav`.
- Усилен UX безопасности `/admin`:
  - Убраны prefilled credentials и quick access по умолчанию.
  - Разрешена только явная dev-активация через `VITE_ENABLE_ADMIN_QUICK_ACCESS=true`.
- Оптимизирована загрузка:
  - `App` переведен на `React.lazy + Suspense`.
  - `vite.config.ts` настроен на vendor chunking (`react`, `charts`, `motion`, `icons`).

## Почему так сделано

- Для демо на хакатоне критично убрать deceptive controls и повысить предсказуемость UI: пользователь должен видеть, что введенные данные реально влияют на результат.
- A11y и клавиатурный контур закрывают риск “неуправляемости” интерфейса на judging-сценариях и соответствуют базовым практикам WCAG/APG.
- Разделение тяжелых зависимостей уменьшает стартовую нагрузку интерфейса data-dense control plane.

## С какими трудностями столкнулся

- E2E падали не из-за кода, а из-за рассинхронизации preview-порта/устаревших процессов и stale build dist.
- После усиления типизации `ServerOrder.name` пришлось обновить существующие тестовые фикстуры.

## Какие решения принял

- Добавил совместимую migration-стратегию (`ADD COLUMN IF NOT EXISTS`) для существующих окружений.
- Зафиксировал минимально-хрупкий Playwright a11y сценарий на `/admin` (проверка отсутствия prefill/quick access), чтобы избежать флаков из-за условного UI routing.
- Перенес `DataFreshness` в отдельный pattern-компонент и переиспользовал в админке/аренде.

## Планы на следующую итерацию

- Добавить полноценный `@axe-core/playwright` проход по ключевым экранам (`marketplace`, `myCompute`, `admin`).
- Пройти контраст токенов инструментально (особенно `textSecondary/textMuted` на `surface/elevated`).
- Добить адаптив таблиц на узких ноутбуках (дополнительные compact layouts для action-heavy строк).
