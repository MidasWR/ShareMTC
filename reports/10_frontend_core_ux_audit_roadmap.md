# Iteration 10 - Frontend Core UX Audit and Roadmap

## Scope

Full UX pass over four core flows:

1. Resources/Templates -> VM/POD lifecycle.
2. Server rental -> estimate/order -> management.
3. Admin operations (access/servers/sharing).
4. Billing and usage control.

## What was done

- Defined one shared UX scoring rubric for all front flows (`Severity`, `Frequency`, `Business impact`).
- Ran a structural flow audit from user action to UI/system response with direct mapping to frontend files.
- Built prioritized backlog with measurable acceptance criteria for each issue.
- Prepared a Wave 1/2/3 delivery roadmap and minimal verification plan.
- Updated repository-level documentation (`README.md`) with UX quality bar and roadmap focus.

## Why this approach

- Previous UX polish iterations improved consistency, but not all high-impact conversion/trust risks were closed.
- Core flows share interaction patterns (forms, async refresh, action feedback), so one rubric prevents local optimization and global inconsistency.
- A wave model allows shipping critical fixes first without blocking broad UX cleanup.

## Shared UX scoring rubric

- **Severity (S):** `S0` blocker, `S1` major friction, `S2` polish.
- **Frequency (F):** `F3` frequent, `F2` regular, `F1` edge-case.
- **Business impact (B):** `B3` high, `B2` medium, `B1` low.

Priority rule:

- Any `S0` issue goes to Wave 1.
- For non-`S0`, prioritize by highest combined `F` and `B`.

## Structured audit by flow

### A) Resources/Templates -> VM/POD lifecycle

#### Findings

1. **Hidden and rigid defaults in VM creation**
   - File: `services/frontend/src/features/resources/vm/VMPanel.tsx`
   - Symptom: create action silently submits many fixed hardware/network/template values.
   - Risk: users cannot predict result shape from visible inputs.
   - Score: `S1/F3/B2`

2. **Template builder lacks input validation clarity**
   - File: `services/frontend/src/features/resources/templates/MyTemplatesPanel.tsx`
   - Symptom: JSON/script fields can be submitted without client-side structure checks.
   - Risk: failed creates/updates with late server errors and unclear recovery.
   - Score: `S1/F2/B2`

3. **Shared POD publishing uses hardcoded provider and shape values**
   - File: `services/frontend/src/features/resources/shared/SharedPodsPanel.tsx`
   - Symptom: offer metadata is not derived from selected runtime data.
   - Risk: trust loss between visible offer and actual capacity semantics.
   - Score: `S1/F2/B2`

### B) Server rental -> estimate/order -> management

#### Findings

1. **Order-to-VM linkage is heuristic and unstable**
   - File: `services/frontend/src/features/rental/ServerRentalPanel.tsx`
   - Symptom: VM mapping is inferred by `name === order.id || template === plan_id`.
   - Risk: lifecycle actions can target wrong VM or fail unpredictably.
   - Score: `S0/F2/B3`

2. **Numeric fields accept invalid operational values**
   - File: `services/frontend/src/features/rental/ServerRentalPanel.tsx`
   - Symptom: zero/negative-friendly parsing via `Number(value) || 0`.
   - Risk: wasted requests and noisy error cycles.
   - Score: `S1/F3/B2`

3. **Refresh feedback is action-only, not state-oriented**
   - File: `services/frontend/src/features/rental/ServerRentalPanel.tsx`
   - Symptom: refresh toasts do not expose stale vs updated order state details.
   - Risk: users repeat refresh/actions due to uncertain completion state.
   - Score: `S2/F2/B2`

### C) Admin operations (access/servers/sharing)

#### Findings

1. **Admin access form is prefilled with static credentials**
   - File: `services/frontend/src/features/admin/access/AdminAccessPanel.tsx`
   - Symptom: username/password default values are visible in initial form state.
   - Risk: insecure-by-default entry UX and operational confusion.
   - Score: `S0/F3/B3`

2. **Console refresh model is fragmented**
   - File: `services/frontend/src/features/admin/console/AdminConsolePanel.tsx`
   - Symptom: separate refresh controls for command/data with no global freshness indicator.
   - Risk: operators act on stale sections assuming full refresh happened.
   - Score: `S1/F2/B3`

3. **Risk module entry points are split across tabs**
   - File: `services/frontend/src/features/admin/console/AdminConsolePanel.tsx`
   - Symptom: `risk` tab shows sharing admin panel and computed risk table separately.
   - Risk: higher cognitive switching cost during incident triage.
   - Score: `S2/F2/B2`

### D) Billing and usage control

#### Findings

1. **Usage processing relies on hardcoded utilization payload**
   - File: `services/frontend/src/features/billing/hooks/useBilling.ts`
   - Symptom: `processUsage` request always sends fixed CPU/RAM/GPU/hours/network values.
   - Risk: misleading cost preview and low operator trust in billing UI.
   - Score: `S0/F3/B3`

2. **Insufficient guardrails around provider/plan workflow**
   - Files:
     - `services/frontend/src/ui/BillingPanel.tsx`
     - `services/frontend/src/features/billing/hooks/useBilling.ts`
   - Symptom: only basic required checks, no progressive guidance for invalid state transitions.
   - Risk: repeated invalid submissions and low discoverability of correct flow.
   - Score: `S1/F2/B2`

3. **Asynchronous feedback does not expose data recency**
   - File: `services/frontend/src/ui/BillingPanel.tsx`
   - Symptom: status/info messaging lacks timestamped freshness marker.
   - Risk: weak confidence in financial reconciliation screens.
   - Score: `S2/F2/B2`

## Prioritized backlog

### Blockers (Wave 1 candidate)

1. Remove prefilled admin credentials and enforce explicit admin entry.
2. Replace rental order-to-VM heuristic with deterministic linkage contract.
3. Replace hardcoded billing usage payload with user-controlled or source-derived inputs.

### High-impact friction (Wave 2 candidate)

1. Add strict numeric validation and field-level constraints in rental/order forms.
2. Expose explicit freshness/state indicators in admin and rental refresh surfaces.
3. Validate template builder inputs (JSON/script/public key format hints and pre-submit checks).

### Quick wins / polish (Wave 3 candidate)

1. Unify lifecycle completion copy and action-result language across VM/rental/admin.
2. Reduce hidden defaults by surfacing key create parameters and contextual helper text.
3. Align risk/sharing information architecture for lower cognitive load.

## Delivery roadmap

## Wave 1 - Trust and safety baseline

### Scope

- `services/frontend/src/features/admin/access/AdminAccessPanel.tsx`
- `services/frontend/src/features/rental/ServerRentalPanel.tsx`
- `services/frontend/src/features/billing/hooks/useBilling.ts`
- Related API client contracts if deterministic linkage requires response changes.

### Expected outcomes

- No static credentials in admin entry.
- Lifecycle actions bind to correct compute unit deterministically.
- Billing preview reflects actual user-selected usage dimensions.

### Verification

- Manual flow checks for admin access, rental lifecycle, billing preview.
- Unit tests for deterministic mapping helper and billing payload builder.

## Wave 2 - Efficiency and error prevention

### Scope

- `services/frontend/src/features/rental/ServerRentalPanel.tsx`
- `services/frontend/src/features/resources/templates/MyTemplatesPanel.tsx`
- `services/frontend/src/features/admin/console/AdminConsolePanel.tsx`

### Expected outcomes

- Invalid numeric payloads blocked before request dispatch.
- Template form rejects malformed JSON and highlights exact invalid fields.
- Admin refresh surfaces explicit section freshness.

### Verification

- Unit tests for validators.
- Manual error-state journey checks (invalid inputs, stale data, retry).

## Wave 3 - Consistency and cognitive load reduction

### Scope

- `services/frontend/src/features/resources/vm/VMPanel.tsx`
- `services/frontend/src/features/resources/shared/SharedPodsPanel.tsx`
- Shared design patterns in `services/frontend/src/design/*`

### Expected outcomes

- Consistent operation copy, status semantics, and action confirmations.
- Reduced hidden defaults across creation/publishing panels.
- Clearer separation of risk and sharing operational views.

### Verification

- UI consistency checklist across all four core flows.
- Smoke pass on navigation and high-frequency actions.

## Difficulties encountered

- Some UX defects are rooted in API contract gaps rather than pure view composition (for example deterministic VM linkage).
- Existing state and feedback patterns are distributed across feature modules, requiring cross-module alignment decisions.
- Data freshness semantics are currently implicit in several panels, so consistency requires a shared pattern definition.

## Decisions made

- Prioritize trust/safety-impacting issues before broad visual polish.
- Treat deterministic action targeting as non-negotiable for lifecycle operations.
- Keep roadmap split into waves to preserve delivery cadence and avoid all-or-nothing refactor behavior.

## Next iteration plan

1. Execute Wave 1 changes with tests first.
2. Re-run the same `S/F/B` rubric after Wave 1 and update issue scores.
3. Start Wave 2 only after Wave 1 acceptance criteria pass in manual and unit checks.
