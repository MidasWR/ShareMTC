# Iteration 3 - Frontend PR Breakdown and Definition of Done

## PR1 - Tokens, typography, and layout shell

### Scope

- Update Tailwind theme extensions for semantic colors and scales.
- Add global layout and focus utility classes.
- Introduce shell-level structure with sidebar, top header, and content container.

### Key files

- `services/frontend/tailwind.config.js`
- `services/frontend/src/styles.css`
- `services/frontend/src/ui/App.tsx`

### Definition of done

- No raw hardcoded visual values in new shell components.
- Focus-visible styles consistently present for keyboard navigation.
- Build succeeds and all sections render under unified container system.

## PR2 - Design primitives and shared UI components

### Scope

- Add primitives for button, input, select, card, badge, tabs.
- Add shared components for table, modal, drawer, toast.
- Add base patterns (empty, skeleton, status badge, metric tile, log view).

### Key files

- `services/frontend/src/design/primitives/*`
- `services/frontend/src/design/components/*`
- `services/frontend/src/design/patterns/*`

### Definition of done

- All newly refactored screens consume primitives/components, not ad-hoc markup.
- Shared components provide loading/disabled/error-compatible states.
- Accessibility metadata exists for core interactive components.

## PR3 - Auth and provider screen migration

### Scope

- Refactor AuthPanel with validation and consistent form states.
- Refactor AdminPanel to table-driven provider list with details drawer.

### Key files

- `services/frontend/src/ui/AuthPanel.tsx`
- `services/frontend/src/ui/AdminPanel.tsx`

### Definition of done

- Auth errors are field-aware and summary-aware.
- Provider list supports refresh and resilient empty/error/loading behavior.
- All provider actions are keyboard reachable.

## PR4 - Pods and allocations redesign

### Scope

- Refactor HostPanel into operation-focused allocation management UI.
- Add create flow modal, release confirmation, details drawer, and action safety.

### Key files

- `services/frontend/src/ui/HostPanel.tsx`

### Definition of done

- Create and release actions use existing resource service contracts only.
- Statuses are represented through unified badge language.
- High-risk action (stop/release) requires explicit confirmation.

## PR5 - Billing and usage redesign

### Scope

- Add BillingPanel for process-usage and accrual history.
- Add KPI summary tiles and dense financial table behavior.

### Key files

- `services/frontend/src/ui/BillingPanel.tsx`

### Definition of done

- Billing view works with existing billing service endpoints.
- Cost values are displayed with stable tabular numeric formatting.
- Empty and error states are explicit and actionable.

## PR6 - Data-heavy controls unification

### Scope

- Introduce reusable table controls:
  - pagination
  - density toggle
  - column picker
- Apply controls consistently to pods/providers/billing tables.

### Key files

- `services/frontend/src/design/hooks/useTableControls.ts`
- `services/frontend/src/design/components/TableToolbar.tsx`
- `services/frontend/src/design/components/ColumnPicker.tsx`
- `services/frontend/src/ui/AdminPanel.tsx`
- `services/frontend/src/ui/HostPanel.tsx`
- `services/frontend/src/ui/BillingPanel.tsx`

### Definition of done

- All data-heavy tables use the same control language and behavior.
- Row identity is stable via explicit `rowKey`.
- Filtering and sorting remain predictable under pagination.

## PR7 - Accessibility and keyboard pass

### Scope

- Add skip navigation support and keyboard shortcuts modal.
- Add escape behavior for overlays and improve aria semantics.

### Key files

- `services/frontend/src/ui/App.tsx`
- `services/frontend/src/ui/KeyboardShortcutsPanel.tsx`
- `services/frontend/src/design/components/Modal.tsx`
- `services/frontend/src/design/components/Drawer.tsx`
- `services/frontend/src/design/components/Table.tsx`

### Definition of done

- Main content is reachable from skip link.
- Overlays are closable with keyboard.
- Interactive table and action controls expose accessible labels.

## PR8 - Stabilization and QA hardening

### Scope

- Run final responsive, accessibility, and performance pass.
- Remove residual visual inconsistencies and dead utility classes.
- Validate contract safety for all frontend API calls.

### Key files

- Cross-cutting updates under `services/frontend/src/*`

### Definition of done

- Frontend build and lint are clean.
- No API endpoint or payload contract changes were introduced.
- QA checklist can be run by reviewers without implementation knowledge.
