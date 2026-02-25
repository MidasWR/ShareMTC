# Iteration 12 - Frontend tabs/navigation/marketplace demo polish

## What was done

- Reworked top-level sidebar IA into five product groups: `Marketplace`, `My Compute`, `Provide Compute`, `Billing`, `Admin` (+ `Settings` in account area).
- Added backward-compatible legacy section mapping so old `?section=` links still resolve to new top-level groups.
- Upgraded reusable `Tabs` primitive with:
  - horizontal overflow support,
  - active underline marker,
  - visual tab separators,
  - optional `More` collapse mode.
- Applied collapsed-tabs behavior to `Admin Console` where tab count is high.
- Introduced dual-brand tokenization (`mts` and `neon`) via CSS variables + Tailwind token bindings.
- Added brand theme selector in Settings and persisted selection in `localStorage`.
- Implemented a single-screen marketplace showcase flow:
  - catalog with filters on the left,
  - compact deploy with explicit summary on the right,
  - `My Instances` directly below deploy.
- Reduced “hidden magic defaults” in VM flow by deriving advanced fields from selected template and surfacing full deploy summary before create.
- Added focused unit tests for:
  - tab splitting + keyboard cycling helpers,
  - legacy navigation mapping,
  - deploy summary contract.

## Why this approach

- Hackathon judging requires immediate clarity of core value flow; excessive one-level navigation was creating avoidable cognitive load.
- Many admin tabs previously did not scale to narrow screens; adaptive tab behavior prevents layout breakage without heavy redesign.
- Brand mismatch risk was mitigated by introducing theme tokens rather than hardcoded palette rewrites.
- Deploy trust improves when users see exact resulting configuration and hidden infra values before action.

## Difficulties encountered

- Existing app routing relied on many flat section ids, so preserving old deep links required an explicit compatibility map.
- Theme migration required replacing hardcoded Tailwind hex values with CSS variable-backed tokens while retaining current utility usage.
- New marketplace showcase needed to reuse existing APIs without introducing backend contract changes.

## Decisions made

- Keep `Admin` always visible in sidebar, independent of role, with guarded admin workspace content.
- Preserve existing backend endpoints and assemble showcase flow from current template/order APIs.
- Use local `brandTheme` persistence for demo readiness and keep backend settings payload unchanged for this iteration.

## Next iteration plan

1. Add integration-level UI tests for `Tabs` overflow and `More` interaction in rendered DOM.
2. Replace heuristic VM/share defaults in remaining provider forms with fully data-derived presets from selected inventory.
3. Introduce lightweight analytics events for first-time path success (`Marketplace -> Deploy -> Running`).
