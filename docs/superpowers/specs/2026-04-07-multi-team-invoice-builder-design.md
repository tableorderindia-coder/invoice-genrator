# Multi-Team Invoice Builder Design

## Goal

Upgrade invoice drafting so invoices can include multiple reusable teams, with team selection based on a company-scoped team catalog instead of manual free-text entry.

## Product Rules

- Draft invoices can include multiple teams at once.
- Team selection in invoice drafting should use existing team options for the company.
- Users can create a new team inline if the required team does not already exist.
- Adding a team to a draft invoice automatically adds all employees whose `defaultTeam` matches that team name.
- Removing a member from an invoice only removes that invoice line item. It must not edit the underlying employee record or team catalog.
- Invoice teams remain a monthly snapshot. Team membership changes later must not mutate old invoices.

## Data Model

### Master teams

Add a new `teams` table:

- `id`
- `company_id`
- `name`
- `created_at`

This acts as the reusable company team catalog.

### Compatibility with existing employees

Employees currently store `defaultTeam` as text. To avoid a large migration, invoice member auto-import will match:

- `teams.name`
- against `employees.default_team`
- case-insensitively

This lets us introduce a real team catalog without forcing an employee schema rewrite right now.

### Invoice snapshot behavior

Invoice team rows still live in `invoice_teams`.
Invoice members still live in `invoice_line_items`.
When a team is added to an invoice, matching employees are copied into invoice line items with snapshot fields.

## UI

### Create Invoice

The create page should:

- show available teams for the selected company
- allow selecting multiple teams before creating the draft
- create the invoice and immediately pre-add those teams

If no team is selected, the invoice can still be created empty.

### Draft Editor

The draft editor should change from a single selected-team workspace to a multi-team overview:

- team manager uses a dropdown of existing company teams
- inline create-new-team input remains available
- all invoice teams are shown together on the page
- each team renders its own member table
- each member row has a remove action
- removing a team still removes the whole invoice team and its snapshot rows

The manual "add candidate to selected team" flow is removed from the draft editor in favor of team-driven auto-population.

## Data Flow

1. User picks a company on create-invoice.
2. UI loads available team options for that company.
3. User selects one or more teams.
4. Server creates draft invoice.
5. Server adds each selected team to the invoice.
6. For each selected team, server finds employees whose `defaultTeam` matches that team name.
7. Server creates invoice line items for those employees using employee defaults.
8. In the draft editor, the user can remove invoice members or whole teams without affecting master team data.

## Error Handling

- Duplicate team selection for the same invoice must be blocked.
- Creating a team with a duplicate company-scoped name must be blocked case-insensitively.
- Adding the same employee twice to the same invoice team must still be blocked.
- If a selected team has no matching employees, the invoice team can still exist and show an empty state.

## Testing

Add focused tests for:

- merging available team options from master teams and employee default-team strings
- case-insensitive employee-to-team matching
- auto-importing all matching employees when a team is added to an invoice
- removing one invoice line item without affecting other team members

## Out of Scope

- employee schema migration from `defaultTeam` string to `team_id`
- drag-and-drop member reassignment between teams
- team editing screens outside the invoice flow
- inline editing of imported member hours/rates beyond the current capabilities
