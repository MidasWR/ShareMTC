# 4_frontend_admin_dashboards_upgrade

## Что было сделано

- Перестроен фронтовый shell и навигация:
  - `services/frontend/src/app/shell/AppShell.tsx`
  - `services/frontend/src/app/navigation/SidebarNav.tsx`
  - `services/frontend/src/app/routing/useSectionRouting.ts`
  - `services/frontend/src/app/auth/useSessionState.ts`
- Введен auth-aware HTTP слой:
  - `services/frontend/src/lib/http.ts` теперь автоматически добавляет `Authorization: Bearer`.
  - Добавлены feature API-клиенты:
    - `features/admin/api/adminApi.ts`
    - `features/resources/api/resourcesApi.ts`
    - `features/billing/api/billingApi.ts`
    - `features/provider/api/providerApi.ts`
- Выполнена декомпозиция монолитных панелей по SRP:
  - `HostPanel` -> `features/resources/components/*` + `hooks/useAllocations.ts`
  - `AdminServersPanel` -> `features/admin/servers/components/*` + `hooks/useServers.ts`
  - `BillingPanel` -> `features/billing/components/*` + `hooks/useBilling.ts`
- Реализованы бизнес-дашборды:
  - `features/dashboard/core/CoreDashboardPanel.tsx` (KPI + revenue trend chart)
  - `features/dashboard/admin/AdminDashboardPanel.tsx` (KPI + top providers + risk feed)
  - Усилен provider dashboard с агрегированными метриками.
- Реализована полноценная админка:
  - `features/admin/console/AdminConsolePanel.tsx` (overview/providers/allocations/billing/risk).
- Backend security и аналитика:
  - Добавлен middleware в `services/sdk/auth/middleware.go` (`RequireAuth`, `RequireAnyRole`).
  - В `adminservice/resourceservice/billingservice` добавлен `JWTSecret` в config и подключен RBAC в роутинге.
  - Добавлены аналитические endpoints:
    - Admin: `/v1/admin/stats`, `/v1/admin/providers/{providerID}`, `/v1/admin/providers/{providerID}/metrics`
    - Resource: `/v1/resources/admin/stats`, `/v1/resources/admin/allocations`
    - Billing: `/v1/billing/admin/stats`, `/v1/billing/admin/accruals`
- Обновлены frontend типы API в `services/frontend/src/types/api.ts`.
- Добавлен unit тест фронта: `services/frontend/src/lib/auth.test.ts`.

## Почему так сделано

- Монолитные экраны мешали масштабированию и повторному использованию логики.
- Дашборды без агрегатов и RBAC не могли быть production-grade.
- Централизованный API client устраняет дублирование и снижает риск ошибок авторизации.
- Feature-first структура упрощает поддержку и review при росте числа экранов.

## С какими трудностями столкнулся

- В исходной версии backend endpoints были открыты без JWT/RBAC.
- Для cross-domain аналитики требовалось аккуратно внедрить агрегаты без ломки текущих контрактов.
- После декомпозиции появились TS-несоответствия в таблицах (обязательный `emptyState`).

## Какие решения принял

- RBAC реализован в SDK как переиспользуемый middleware слой.
- Агрегации добавлены прямо в storage/repo каждого доменного сервиса.
- Admin Console построена как единый модуль с внутренними табами и data-dense таблицами.
- Для графиков выбран `recharts` как легкий и интегрируемый вариант под текущий React stack.

## План на следующую итерацию

- Добавить server-side сортировку/фильтры для admin списков через query параметры.
- Ввести кэширование и request deduplication для dashboard polling.
- Добавить e2e smoke сценарии под новый Admin Console workflow.
- Вынести общие table presets в отдельный shared модуль.
