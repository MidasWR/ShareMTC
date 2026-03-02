# Frontend (ShareMTC)

## Purpose

This frontend provides the operator and marketplace UI for ShareMTC:
- authentication and role-based navigation
- marketplace catalog and deployment wizard
- runtime lifecycle management for VMs/PODs/Kubernetes clusters
- provider/admin dashboards and operational consoles
- settings and SSH key management

## Directory Structure

```text
services/frontend/
  src/
    app/          # shell, routing helpers, providers, i18n
    design/       # UI primitives, reusable patterns, layout components
    features/     # domain modules (admin, marketplace, resources, rental, billing)
    lib/          # shared browser/runtime helpers
    types/        # API contract types
  tests/          # Playwright e2e/a11y smoke tests
```

## Architecture Notes

- `design/primitives` contains low-level controls (`Button`, `Input`, `Select`, `Textarea`) and enforces shared behavior (focus ring, touch-target sizing, field-level error states).
- `design/components` and `design/patterns` provide cross-feature interaction patterns:
  - `ToastProvider` for contextual feedback
  - `Modal` for confirmation flows
  - `DataFreshnessBadge` for refresh visibility and system status
- `features/*` modules contain business logic and API calls, but consume shared UX/a11y primitives instead of re-implementing behavior.
- Feedback messaging is standardized through `design/utils/operationFeedback.ts`.

## Run Locally

```bash
cd services/frontend
npm install
npm run dev
```

Build and preview:

```bash
npm run build
npm run preview
```

## Test Commands

```bash
npm run test:unit
npm run test:a11y
npm run test:e2e
```

## Assumptions and Constraints

- API endpoints are configured via `src/config/apiBase.ts` and environment.
- Some screens depend on backend orchestration states (for example, VM/K8s lifecycle transitions).
- Accessibility goals follow WCAG-oriented checks in shared primitives and smoke tests; contrast must still be validated against brand token updates.
