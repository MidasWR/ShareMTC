# Iteration 8 - RunPod-style Core UX Pass

## What was implemented

- Added RunPod-style filterable catalog experience:
  - multi-control top filter toolbar
  - VRAM range row
  - grouped catalog sections (`Featured GPUs`, `NVIDIA latest generation`)
  - compact instance tiles with availability/network/cloud metadata
- Expanded backend/filter contracts to support real filter semantics:
  - `region`
  - `cloud_type` (`secure`/`community`)
  - `network_volume_supported`
  - `global_networking_supported`
  - `availability_tier`
  - `min_vram_gb`
  - `sort_by`
- Extended VM and template data models with operational fields used by catalog and manage views.
- Reworked `MyServers` into a denser manage view:
  - search + status/type filters
  - compact table with status chips
  - quick lifecycle action controls
- Updated dashboards toward operational observability:
  - actionable anomaly feed in Core dashboard
  - severity badges in Admin risk feed
- Updated sidebar grouping labels toward RunPod-like mental model (`Manage`, `Resources`, `Administration`, `Account`).

## Why this approach

- The requested UX target requires strict alignment between controls and backend data. Adding filters without storage/query support would create non-functional UI and violate no-placeholder constraints.
- RunPod-like usability depends on dense, low-friction controls and clear status signaling; this is why dense tables, grouped cards, and badge-driven statuses were prioritized.
- Keeping changes within existing service boundaries (`resourceservice` + frontend feature modules) preserves architecture consistency while enabling iterative UX upgrades.

## Difficulties encountered

- Existing resource models lacked several filter-driving fields; schema and queries had to be expanded safely and compatibly.
- Catalog data comes from mixed sources (admin catalog + resource templates), which required careful composition in frontend sections.
- Lifecycle actions in `MyServers` depend on mapping between order entities and VM entities, which is still a weak coupling point.

## Decisions made

- Implemented filter-aware list contracts in `resourceservice` rather than inventing a parallel query endpoint.
- Added schema defaults for new fields (`region`, `cloud_type`, availability/network flags) to keep migration behavior stable.
- Chose an iterative matching strategy: first pass mirrors RunPod interaction patterns and layout hierarchy; visual polish can continue in follow-up iterations.

## Next iteration plan

- Replace order-to-VM heuristic mapping with explicit backend linkage field.
- Add richer action menus and keyboard-accessible compact controls in the design system.
- Add provider/location-aware grouping sections and facet counts in catalog.
- Add focused e2e coverage for filter pipelines and lifecycle action outcomes.
