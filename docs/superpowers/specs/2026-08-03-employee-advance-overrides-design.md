# Employee Advance Overrides and SaaS Surface Contrast

## Scope

This change corrects the dashboard accounting column order, adds an optional employee-month Advance INR override, and fixes shared dropdown and interactive-surface contrast in the white SaaS presentation. It preserves all existing accounting formulas except for choosing the effective Advance INR value and does not change existing records unless a user explicitly saves an override.

## Employee Advance Override

Add nullable `advance_override_inr_cents` to `invoice_payment_employee_entries`. A null value means automatic calculation remains active:

`Effective Advance INR = Onboarding Advance USD x employee-month cashout rate`

When an override is present:

`Effective Advance INR = advance_override_inr_cents`

The override changes only the displayed Advances value and the optional Advances deduction in Net P&L. It must not change Effective Dollar Inward, Effective INR Inward, Forex Gain, Operating Margin, Gross P&L, onboarding advance USD, or any other cash-flow input. Clearing the field restores automatic calculation.

The employee dashboard exposes the effective amount as an editable INR field in Edit mode for rows backed by an employee cash-flow record. Salary-only synthetic rows remain read-only because there is no cash-flow record to update. Both the SaaS unified table and Legacy employee table use the same value and save contract.

The nullable override flows through employee row types, Supabase row mapping, single-row and bulk updates, period aggregation, Overview summaries, and visible CSV/PDF exports. Period values sum employee-level effective advances, preserving mixed-rate correctness.

## Column Ordering

The canonical employee and period option registries will place columns in this order wherever selected:

`Salary Paid | PF | TDS`

Explicit URL column selections still control visibility. The registry controls presentation order, so default and custom views remain consistent. Export definitions use the same accounting order.

## Mode-Aware Interactive Surfaces

The shared checklist dropdown will use semantic CSS classes and portal color variables rather than a hardcoded dark panel. SaaS mode receives a white panel, dark readable text, light borders, visible hover/focus states, and native checkbox contrast. Legacy mode retains its existing dark glass appearance.

The SaaS audit covers shared dropdowns, popovers, selectors, editable panels, and table controls that currently hardcode translucent legacy backgrounds. These surfaces will use mode-aware variables or narrowly scoped SaaS overrides. Decorative status colors and the Legacy presentation remain unchanged.

## Persistence And Compatibility

The migration is additive and idempotent. It adds one nullable bigint column and does not backfill existing rows. Existing employee-months therefore retain their current calculated Advance INR. Existing permissions and dashboard update authorization continue to protect writes.

Bulk saves validate the override as a non-negative integer number of paise or null. Failed rows retain their dirty state and existing row-specific error reporting. Successful saves return the persisted effective row data.

## Verification

Automated tests will cover:

- canonical Salary Paid, PF, TDS order in employee and period views;
- automatic advance fallback, explicit override, and clearing an override;
- unchanged Effective Dollar Inward and Gross P&L after an override;
- changed Advances and Net P&L after an override;
- mixed employee overrides in period totals, Overview, and CSV/PDF exports;
- Supabase mapping and single-row/bulk persistence;
- readable SaaS checklist styling while preserving Legacy styling;
- shared interactive surfaces no longer using legacy-only backgrounds in SaaS.

The complete test, lint, and production build suites will run before browser inspection. The Supabase-backed build will be checked at desktop and mobile sizes without editing live financial data. The new pull request will target `codex/automatic-filter-loading` so it remains isolated from the existing stacked work.
