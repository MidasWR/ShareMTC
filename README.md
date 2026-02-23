# ShareMTC Platform

ShareMTC is a compute marketplace and control plane where providers expose CPU/RAM/GPU/network capacity and users consume that capacity through allocation and billing contracts.

## Project goals

- Provide a secure control plane for provider onboarding, allocation lifecycle, and billing.
- Separate domain responsibilities by service and keep APIs contract-driven.
- Offer data-dense operational dashboards for core, provider, and admin roles.

## Repository layout

- `installer/` - bootstrap and host installation scripts.
- `services/` - microservices, frontend, and shared SDK.
- `charts/` - Helm charts for app and infrastructure stacks.
- `reports/` - iteration reports with implementation rationale.

## Service map

- `services/authservice` - registration/login, Google OAuth, JWT issuance.
- `services/adminservice` - provider catalog and admin analytics endpoints.
- `services/resourceservice` - heartbeat ingest, allocation/release, VM lifecycle, shared resources, health checks, metrics, and internal K8s orchestration.
- `services/billingservice` - plan management, usage processing, accrual analytics.
- `services/hostagent` - host-side telemetry collector for donor/internal machines.
- `services/frontend` - React + TypeScript control plane UI.
- `services/sdk` - shared auth, DB, logging, and HTTP primitives.

## Architecture decisions

- **Service boundaries:** each Go service follows `cmd/config/internal/{adapter,models,service}`.
- **Shared auth:** JWT parsing and RBAC middleware live in `services/sdk/auth`.
- **Frontend SRP:** app shell, routing, auth state, and domain panels are separated by feature module.
- **Admin analytics:** computed from real persisted allocations/accruals/providers without mocks.

## Frontend architecture

`services/frontend/src` now follows feature-oriented composition:

- `app/` - shell, navigation, section routing, session hooks.
- `design/` - primitives/components/patterns for reusable UI building blocks.
- `features/` - domain modules (`admin`, `resources`, `billing`, `provider`, `dashboard`).
- `features/catalog` - GPU POD catalog and launch templates.
- `features/rental` - MyServers operations with search/refresh/create routing.
- `features/resources/templates` - server install templates (FastPanel/aaPanel class).
- `features/resources/vm` - VM lifecycle UI (create/start/stop/reboot/terminate).
- `features/resources/shared` - shared VM and shared POD control panels.
- `features/resources/k8s` - Kubernetes cluster management through internal orchestrator.
- `features/settings` - personalization and SSH key management.
- `features/admin/access` - direct `/admin` access panel.
- `lib/` - auth-aware HTTP client and session helpers.
- `ui/` - top-level sections bound to app navigation.
- `types/` - API contracts for all frontend modules.

### Implemented dashboards

- **Core Dashboard** - provider health ratio, allocation pressure, and revenue trend chart.
- **Provider Dashboard** - provider-specific allocations, earnings, and operational state.
- **Admin Dashboard** - top revenue providers, global metrics, and risk feed.
- **Admin Console** - tabbed admin module for overview/providers/allocations/billing/risk.

### Navigation and localization

- Core navigation now uses product tabs: `My Templates`, `VM`, `Shared VM`, `PODs`, `Shared PODs`, `Kubernetes Clusters`, `My Servers`.
- `overview` was removed from Core and routing defaults to `myTemplates`.
- Sidebar route icons were added for all core/admin/provider sections.
- UI language defaults to English, and visible panel copy is aligned to EN.

### RunPod-style UX direction

- Catalog and manage flows now follow a RunPod-like operational pattern:
  - top filter toolbar (`GPU/CPU`, cloud type, region, network features, additional filters),
  - VRAM slider row,
  - grouped instance tiles (`Featured`, `Latest generation`),
  - dense operational tables with status chips and quick actions.
- This UX is backed by real API filters (no placeholder controls).

### Security model

- Backend routes in admin/resource/billing services are protected by:
  - `RequireAuth` (JWT verification)
  - `RequireAnyRole("admin", "super-admin", "ops-admin")` for admin-only endpoints
- Frontend HTTP client attaches `Authorization: Bearer <token>` automatically.
- `401/403` responses clear local session state to prevent stale privilege usage.

## API overview (new analytics endpoints)

- `GET /v1/admin/stats`
- `GET /v1/admin/providers/{providerID}`
- `GET /v1/admin/providers/{providerID}/metrics`
- `GET /v1/resources/admin/stats`
- `GET /v1/resources/admin/allocations?limit=&offset=`
- `GET /v1/resources/health-checks?resource_type=&resource_id=&limit=`
- `POST /v1/resources/health-checks`
- `GET /v1/resources/metrics?resource_type=&resource_id=&metric_type=&from=&to=&limit=`
- `POST /v1/resources/metrics`
- `GET /v1/resources/metrics/summary?limit=`
- `GET /v1/billing/admin/stats`
- `GET /v1/billing/admin/accruals?limit=&offset=`

## API overview (marketplace/rental/settings)

- `GET /v1/catalog/pods`
- `GET /v1/catalog/templates`
- `POST /v1/admin/pods/`
- `DELETE /v1/admin/pods/{podID}`
- `POST /v1/admin/templates/`
- `DELETE /v1/admin/templates/{templateID}`
- `GET /v1/admin/agent/install-command`
- `POST /v1/auth/admin/direct`
- `GET /v1/auth/settings`
- `PUT /v1/auth/settings`
- `GET /v1/auth/ssh-keys`
- `POST /v1/auth/ssh-keys`
- `DELETE /v1/auth/ssh-keys/{keyID}`
- `GET /v1/billing/rental/plans`
- `POST /v1/billing/rental/estimate`
- `POST /v1/billing/rental/orders`
- `GET /v1/billing/rental/orders`
- `GET /v1/resources/vm-templates`
- `GET /v1/resources/vm-templates?search=&region=&cloud_type=&availability_tier=&network_volume_supported=&global_networking_supported=&min_vram_gb=&sort_by=`
- `POST /v1/resources/vm-templates`
- `POST /v1/resources/vms`
- `GET /v1/resources/vms?status=&search=&region=&cloud_type=&availability_tier=&network_volume_supported=&global_networking_supported=&min_vram_gb=&sort_by=`
- `GET /v1/resources/vms/{vmID}`
- `POST /v1/resources/vms/{vmID}/start`
- `POST /v1/resources/vms/{vmID}/stop`
- `POST /v1/resources/vms/{vmID}/reboot`
- `POST /v1/resources/vms/{vmID}/terminate`
- `POST /v1/resources/shared/vms`
- `GET /v1/resources/shared/vms`
- `POST /v1/resources/shared/pods`
- `GET /v1/resources/shared/pods`
- `POST /v1/resources/k8s/clusters`
- `GET /v1/resources/k8s/clusters`
- `POST /v1/resources/k8s/clusters/{clusterID}/refresh`
- `DELETE /v1/resources/k8s/clusters/{clusterID}`

## Local development

### Prerequisites

- Linux/macOS with `docker`, `kubectl`, `helm`, `git`, `gh`.
- Go toolchain and Node.js (LTS recommended).
- PostgreSQL for local service execution.

### Run backend services

```bash
cd services/authservice && go run ./cmd
cd services/adminservice && go run ./cmd
cd services/resourceservice && go run ./cmd
cd services/billingservice && go run ./cmd
```

### Run frontend

```bash
cd services/frontend
npm install
npm run dev
```

## Quality checks

### Frontend

```bash
cd services/frontend
npm run build
npm run test:unit
```

### Backend

```bash
cd services/adminservice && go test ./...
cd services/resourceservice && go test ./...
cd services/billingservice && go test ./...
```

### E2E smoke (Playwright)

```bash
cd services/frontend
npx playwright install chromium
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
# separate terminal
npm run test:e2e
```

## Release flow

`Makefile` supports:

- versioned tags (`TAG=vX.Y.Z`)
- optional stage skipping (`SKIP=1,2,...`)
- image build/push, chart packaging, release publishing
- hostagent multi-platform binaries for GitHub Releases assets:
  - `hostagent-linux-amd64`
  - `hostagent-darwin-amd64`
  - `hostagent-windows-amd64.exe`
- optional auto commit/push before release

```bash
make release TAG=v1.0.0 SKIP=
```

## Reports process

Each iteration report in `reports/` must include:

- what was implemented
- why decisions were taken
- encountered issues
- chosen mitigations
- next iteration plan

Latest upgrade reports:

- `reports/4_frontend_admin_dashboards_upgrade.md`
- `reports/6_full_rebrand_russian_marketplace.md`
- `reports/7_core_vm_k8s_fullstack_iteration.md`
- `reports/8_runpod_style_core_ux_iteration.md`
