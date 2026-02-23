# Iteration 7 - Core VM K8s Fullstack Rework

## What was implemented

- Reworked Core IA and routing: removed `overview` and introduced `My Templates`, `VM`, `Shared VM`, `PODs`, `Shared PODs`, `Kubernetes Clusters`, `My Servers`.
- Added per-route navigation icons in sidebar for core/provider/admin flows.
- Standardized visible frontend UI copy to English and switched default language to `en`.
- Expanded `resourceservice` domain with:
  - VM templates and VM lifecycle (create/list/get/start/stop/reboot/terminate)
  - Shared VM and shared POD APIs
  - Health check records API
  - Time-series metric points and summary API
  - Internal Kubernetes orchestrator adapter and cluster lifecycle API
- Reworked `MyServers` panel:
  - no pagination
  - search + refresh controls
  - single `Create` entry with dropdown route selection
  - removed fake lifecycle/health/log UI simulations
- Updated dashboards to consume real health/metric endpoints and show operational counters.
- Updated README API map and architecture sections to reflect new contracts.

## Why this approach

- Backend-first implementation prevents frontend placeholders and keeps behavior contract-driven.
- New resources are implemented in `resourceservice` to preserve service boundaries and avoid introducing a second orchestration service in this iteration.
- Explicit lifecycle endpoints reduce UI ambiguity and keep action semantics deterministic.
- English-first UI simplifies product consistency and aligns with current target audience direction.

## Difficulties encountered

- Existing codebase mixed localized Russian UI text and old section IDs (`overview`, `serverRental`) with newer feature modules.
- `resourceservice` originally only supported allocations/heartbeat, so storage, models, service contracts, handlers, and route wiring had to be extended together.
- Dashboards previously relied on aggregate-only stats and required additional metric/health integrations.

## Decisions made

- Kept Kubernetes orchestration internal to `resourceservice` via adapter interface, with deterministic runtime implementation for cluster provisioning/status/delete.
- Implemented time-series metric storage as `metric_points` with grouped summary endpoint to support graph-ready frontend consumption.
- Reused existing auth/RBAC middleware and aligned new endpoints under `/v1/resources/*`.
- Removed fallback mocks in catalog loading and relied on real APIs to avoid non-production behavior.

## Next iteration plan

- Add provider-specific filtering and ownership checks for shared resources at finer RBAC granularity.
- Add dashboard trend charts for health severity distribution and per-resource metric streams.
- Add richer VM template presets (FastPanel, aaPanel, Docker, kube-node) with admin governance.
- Add integration/e2e suites for VM/K8s lifecycle and sharing flows.
