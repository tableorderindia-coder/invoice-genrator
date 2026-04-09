# Invoice Sorting, Editable Totals, and Employee Edit Tab Design

Date: 2026-04-09
Owner: Billing workflow
Status: Proposed (approved in chat, pending final spec review)

## 1. Problem Statement

The invoice workflow needs four capability upgrades:

1. Employee rows must be sorted within each team by highest billed hourly rate at the top and lowest at the bottom.
2. Totals must be editable across invoices:
   - Per employee line item
   - Per team
   - Grand total
   - Adjustments remain editable
3. Edited totals must be used everywhere (all screens and PDF) as source-of-truth display values.
4. Employees section needs an Edit Employee tab to update complete employee details.

Additionally, user-defined recalc rule:

- Manual totals can be edited.
- If rate/hours are changed later, totals auto-recalculate again (manual overrides are reset).
- Team and grand total manual overrides also auto-recalculate/reset when underlying line items/adjustments change.

## 2. Goals and Non-Goals

## Goals

- Enforce consistent team-partitioned row ordering on every invoice render path.
- Support explicit, persisted total overrides with deterministic reset rules.
- Keep invoice math coherent across draft screen, invoice screens, cashout/invoice references, and PDF output.
- Provide a full Edit Employee tab in Employees page.

## Non-Goals

- No audit trail/change-history ledger for manual overrides in this phase.
- No redesign of unrelated dashboards.
- No retroactive auto-rewrite of historical invoice snapshots unless directly edited.

## 3. Chosen Approach (Option 2)

Adopt a structured source-of-truth approach:

- Add dedicated override fields in storage for line-item/team/grand totals.
- Centralize recalc and override invalidation rules in store/domain logic.
- Move sorting logic to shared selectors used by all invoice renderers and PDF builder.
- Add Employees page tabbed workflow with dedicated update action.

This balances correctness and delivery speed while preventing cross-screen drift.

## 4. Data Model Changes

## 4.1 Invoice Line Items

Add column:

- `manual_total_usd_cents` nullable integer

Interpretation:

- If null: effective total = formula result from billing rate + hours.
- If non-null: effective total = manual override value.

## 4.2 Invoice Teams

Add column:

- `manual_total_usd_cents` nullable integer

Interpretation:

- If null: team total = sum(effective line item totals in team).
- If non-null: displayed team total = manual override (until invalidated).

## 4.3 Invoices

Add column:

- `manual_grand_total_usd_cents` nullable integer

Interpretation:

- If null: grand total = computed subtotal + adjustments.
- If non-null: displayed grand total = manual override (until invalidated).

## 4.4 Adjustments

No new override column required; `amount_usd_cents` is already directly editable and acts as source value.

## 5. Global Recalculation and Invalidation Rules

## 5.1 Employee Line Item Rules

- Manual line-item total may be set directly via UI edit.
- If billing rate or hours changes:
  - Clear line-item `manual_total_usd_cents`
  - Recompute formula total

## 5.2 Team Total Rules

- Team total may be manually edited.
- Any mutation in team line items or any invoice adjustment change invalidates team manual total:
  - Clear `invoice_teams.manual_total_usd_cents`
  - Recompute from effective line totals

## 5.3 Grand Total Rules

- Grand total may be manually edited.
- Any mutation in line items or adjustments invalidates invoice manual grand total:
  - Clear `invoices.manual_grand_total_usd_cents`
  - Recompute computed grand total

## 5.4 Mutation Pipeline

For any invoice mutation:

1. Persist direct change (line item/team/grand/adjustment)
2. Apply override invalidation based on mutation type
3. Recompute effective subtotal/adjustments/grand
4. Persist computed aggregates
5. Revalidate all impacted routes

## 6. Sorting Strategy (Applied Everywhere)

Sorting partition: per team.

Sort order:

1. `billingRateUsdCents` descending
2. Effective row total descending
3. `employeeNameSnapshot` ascending

Application points:

- Draft invoice page (`/invoices/drafts/[id]`)
- Any invoice detail render path
- PDF section generation
- Shared detail selectors in store so all consumers inherit the same order

This ensures all columns stay aligned because row order is determined once per team.

## 7. UI/UX Changes

## 7.1 Invoice Screens (All States)

Expose editable inputs for:

- Line item billed total
- Team total
- Grand total
- Adjustment amounts

Behavior:

- Save actions route through server actions/store methods.
- After save, screen shows effective totals (manual or computed depending on rules).

## 7.2 Draft Page

- Keep existing per-line rate/hours controls.
- Add per-line total input.
- Add team total input in team section summary.
- Add invoice grand total input in top summary or totals block.

## 7.3 Non-Draft Invoice Screens

- Provide same total editing controls to satisfy “every screen” requirement.
- If existing non-draft pages are redirect-based or table-only, add dedicated detail/edit route or inline controls where invoice totals are shown.

## 7.4 PDF Output

- PDF model must consume effective totals (respecting manual edits when valid).
- Section rows and grand total reflect post-rule values.

## 8. Employees Page: Add/Edit Tabs

Convert `/employees` into a two-tab interface:

- Add Employee (existing flow)
- Edit Employee (new flow)

Edit Employee tab capabilities:

- Select/search existing employee
- Edit and save:
  - Company
  - Name
  - Designation
  - Default team
  - Billing rate
  - Payout monthly
  - Hours per week
  - Active from
  - Active to
  - Active status

Propagation rule:

- Employee master updates affect future invoice additions/defaults.
- Existing invoice snapshots remain unchanged unless edited through invoice line-item controls.

## 9. Backend/API Changes

Add server actions/store functions for:

- Update line-item manual total
- Update team manual total
- Update invoice manual grand total
- Update adjustment amount (or extend existing add/remove flow to include update)
- Update employee full details

Refactor recompute path to:

- Compute effective line totals
- Compute effective team totals
- Compute effective grand total
- Persist aggregate fields used by existing dashboard/invoice list screens

## 10. Testing Plan

## Unit tests

- Sorting selector returns per-team rows in required order.
- Effective total resolution:
  - manual override used when present
  - formula used when override absent
- Override invalidation:
  - line manual cleared on rate/hours edit
  - team/grand manual cleared on downstream mutations

## Integration tests (store/actions)

- Edit line total, verify draft + invoice + pdf model values.
- Edit team/grand totals, then mutate line item and verify auto-reset/recalc.
- Edit adjustment amount and verify recalculated totals.
- Edit employee details and verify employees listing reflects updates.

## UI tests

- Draft page shows new editable total fields and saves correctly.
- Non-draft invoice screens allow same edits.
- Team-partitioned sorting is stable after edits and reload.

## 11. Rollout Notes

- Add SQL migration for override columns with null defaults.
- Backfill not required because null means computed behavior.
- Existing invoice totals continue to work unchanged until a manual override is entered.

## 12. Risks and Mitigations

Risk: inconsistent totals between screens.
Mitigation: single shared effective-total computation in store/domain used by all renderers.

Risk: manual overrides becoming stale.
Mitigation: strict invalidation/reset rules on any downstream mutation.

Risk: regressions in dashboards relying on aggregate fields.
Mitigation: preserve aggregate column updates in recompute pipeline and add integration coverage.

## 13. Open Decisions (Resolved)

- Line-item manual total resets when rate/hours change: Resolved = yes.
- Team/grand manual total resets when underlying data changes: Resolved = yes.
- Sorting tie-breakers: Resolved = total desc, then name asc.
- Coverage scope: Resolved = every invoice screen + PDF + employees edit tab.
