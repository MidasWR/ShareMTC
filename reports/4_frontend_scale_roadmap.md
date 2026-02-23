# Iteration 4 - Frontend Scale Roadmap (3-6 Months)

## Objective

Define a realistic scale roadmap after MVP completion to evolve the control plane into a production-grade multi-role platform.

## Phase R1 - Access and tenancy foundation

- Introduce explicit frontend role model:
  - super-admin
  - ops-admin
  - provider
  - consumer
- Add role-policy matrix for routes, actions, and sensitive data visibility.
- Prepare tenant-aware context in frontend state model for future multi-tenant separation.

## Phase R2 - Advanced dashboards

- Admin dashboard:
  - global fleet health
  - resource pressure indicators
  - anomaly feed and incident timeline
- Provider dashboard:
  - revenue trend and forecast
  - utilization by CPU/RAM/GPU
  - reliability score and uptime trend
- Consumer dashboard:
  - pod performance and cost analytics
  - template/image usage efficiency

## Phase R3 - Sharing platform maturity

- Extend sharing management with:
  - reputation and SLA view
  - policy controls for onboarding/eligibility
  - dispute and moderation lifecycle
- Add immutable audit timeline for key moderation actions.

## Phase R4 - Data-heavy enterprise UX

- Move from client-side table controls to server-driven:
  - pagination
  - sorting
  - filtering
- Add saved table views and pinned filter presets.
- Add near-real-time updates via WebSocket or SSE for operation-critical screens.

## Phase R5 - Quality and observability

- Expand e2e coverage to all critical role flows:
  - auth and role gating
  - server onboarding
  - sharing moderation
  - agent verification
  - billing visibility
- Add frontend observability hooks:
  - error tracking
  - UX timing metrics
  - route-level performance budget checks

## Delivery strategy for solo execution

- Work in strict slices:
  - one role flow at a time
  - one table domain at a time
  - one integration boundary at a time
- Keep each PR under a reviewable size with visible user value.
- Avoid backend contract expansion unless tied to a specific milestone and acceptance test.
