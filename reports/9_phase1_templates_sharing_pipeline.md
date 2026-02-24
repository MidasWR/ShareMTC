# Phase 1 Templates & Sharing Pipeline

## What was implemented

- Extended VM template contracts to support richer metadata (`logo_url`, `env_json`, `ssh_public_key`, `bootstrap_script`, `os_family`, visibility/owner fields) and wired them from backend to frontend.
- Added shared inventory marketplace flow:
  - provider-side publish offer,
  - user-side reserve offer (`My Servers` panel),
  - offer listing for shared VM/POD screens.
- Added agent log ingestion and read APIs in `resourceservice`, plus hostagent delivery of logs together with heartbeat.
- Added admin-managed pod routing profile (host/proxy metadata) and server-side reverse proxy endpoint.
- Added brand logo assets and integrated logo/favicons into app shell, sidebar, and auth screen.

## Why this approach

- Kept the system aligned with the no-Atlas/no-ALTER constraint by introducing additive tables for new profile data (`vm_template_profiles`, `pod_route_profiles`, `shared_inventory_offers`, `agent_logs`) while preserving existing core tables.
- Avoided secret leakage by exposing proxy info and routing via backend endpoint instead of shipping SSH secrets to the browser.
- Used typed frontend contracts for all new flows to reduce runtime drift between UI and backend APIs.

## Problems encountered

- Existing runtime DBs may not yet contain new additive tables after deployment, which can cause query failures until services run migration bootstrap once.
- Frontend bundle size warning remains (`vite` chunk > 500kb), not blocking but should be optimized in next iteration.
- Local Go static analysis in this environment is limited by toolchain mismatch (`go.work requires go >= 1.25` vs local 1.22), so verification leaned on TypeScript build + structural code checks.

## Decisions made

- Reused existing endpoints and role model where possible; added new endpoints only for distinct new capabilities (`shared/offers`, `agent-logs`).
- Seeded public standard templates (`FastPanel`, `aaPanel`) at repository migration stage for immediate usability.
- Implemented proxy mode as pragmatic hackathon-ready MVP using reverse proxy with per-pod route target metadata.

## Next iteration plan

- Add explicit integration tests for shared offer reservation concurrency and reverse proxy path handling.
- Add pagination/cursor support for agent logs and health streams.
- Add per-template logo rendering in more screens (VM creation and rental quick deploy).
- Add build chunking optimization and route-level code splitting in frontend.
