# Iteration 13 - Frontend demo-plus-contract UX

## What was done

- Completed demo-focused IA polish with grouped sidebar semantics and clearer active workspace header context.
- Upgraded tabs behavior for crowded admin/provider flows:
  - stronger active marker,
  - segmented visual separation,
  - `many` mode with `More` overflow handling,
  - admin tab URL sync via `?tab=...`.
- Kept MTS as default brand theme and retained Neon as optional mode, while removing neon-only hardcoded button/sidebar accents.
- Reworked rental flow into an explicit product journey:
  - `Marketplace Catalog` (left),
  - compact `Deploy` with `Advanced` and `Summary` (right),
  - `My Instances` lifecycle block below.
- Removed scattered frontend presets by centralizing defaults in:
  - `features/resources/defaults.ts`,
  - `features/rental/defaults.ts`.
- Added minimal backend contract linkage `order ↔ vm`:
  - billing model/storage now include `vm_id` in `server_orders`,
  - frontend `ServerOrder` type includes `vm_id`,
  - mapping now prioritizes server `vm_id` over manual local map.

## Why this approach

- Hackathon demo needs immediate clarity of "where to buy / where to deploy / where to manage", so flow hierarchy matters more than adding new controls.
- Hidden defaults reduce trust in infrastructure products; surfacing source + summary improves predictability.
- Manual-only `orderVmMapping` was brittle; a small backend `vm_id` field creates a single source of truth without invasive API redesign.

## Difficulties encountered

- Existing style primitives still contained neon-specific visual tokens, which conflicted with a clean MTS default.
- `ServerRentalPanel` had mixed responsibilities (filters, catalog, deploy, lifecycle) and required layout reshaping without breaking existing APIs.
- Type constraints around template-derived fields required stricter union-safe handling in VM advanced controls.

## Decisions made

- Preserved existing endpoint set and added only one minimal contract field (`vm_id`) for lifecycle linkage stability.
- Kept manual VM linkage as fallback when `vm_id` is not returned yet, to avoid regressions during rollout.
- Used progressive disclosure (`Advanced`) for infra-heavy parameters; primary path stays compact for judges.

## Next iteration plan

1. Add backend write-path for `vm_id` assignment right after VM creation lifecycle events.
2. Add rendered-component tests for `Tabs` overflow interaction (`many` + `More`) and deploy `Summary/Advanced` visibility.
3. Add smoke e2e check for full demo route: `Marketplace -> Deploy -> My Instances -> Lifecycle`.
