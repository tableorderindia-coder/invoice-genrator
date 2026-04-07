# Invoice Editor Workflow Redesign

Date: 2026-04-07

## Goal

Restructure the invoice editing experience so team management and candidate entry are separated into clearer workflows.

The new experience should match how billing is actually done:

1. Create the invoice first.
2. Add or remove team sections as needed.
3. Click a team card to make it active.
4. Add candidates into the currently selected team.
5. Freely switch between teams while building the invoice.

## Problems In The Current UI

- Team creation and candidate creation are visually separate, but still coupled through a team dropdown in the candidate form.
- Candidates are shown for all teams at once, which makes the page feel noisy as invoices grow.
- There is no direct team removal action in the editor.
- The candidate form asks the user to think about team targeting every time, instead of letting the page maintain a selected team.

## Target Workflow

### 1. Create Invoice Stays Separate

`/invoices/new` remains the page where the user creates the draft invoice with:

- company
- month
- year
- invoice number
- billing date
- due date
- optional duplicate-from-previous-invoice source

No team or candidate entry moves onto the create-invoice page.

### 2. Invoice Detail Becomes A Team Workspace

`/invoices/[id]` becomes the actual invoice-building workspace.

The page keeps the invoice summary at the top, then turns the editor into a team-focused workflow.

## Proposed Layout

### Left Column

- invoice summary card
- selected team candidate table
- adjustments card

### Right Column

- team manager card
- candidate manager card
- note card
- cash out card

## Team Manager

The team manager becomes the control center for team structure inside the invoice.

### Responsibilities

- add new team
- show existing teams as clickable cards
- show which team is currently selected
- allow removing the selected team

### Team Card Behavior

Each team card shows:

- team name
- candidate count
- active/selected visual state

When a card is clicked:

- that team becomes the selected team
- candidate form retargets to that team
- team table updates to show only that team’s candidates

### Team Removal Rule

Removing a team is allowed even when it contains candidates.

When a team is removed:

- the team row is deleted from the invoice
- all candidate line items under that team are deleted from the invoice
- selection moves to the next available team
- if no teams remain, the candidate form becomes disabled

This deletion affects invoice snapshot data only for that draft/editable invoice. It must not affect employee master data.

## Candidate Manager

The candidate manager no longer contains a team dropdown.

### Responsibilities

- show the currently selected team
- add candidates only into the selected team

### Behavior

The form header should read like:

- `Add candidate to Data Engineering`

The form includes:

- employee dropdown
- hours billed
- billing rate override
- payout rate override

The team is not chosen inside the form. It comes from current page selection.

### Empty State

If no team exists yet:

- candidate form is disabled
- helper copy tells the user to create and select a team first

## Candidate Table

The candidate table should show only the currently selected team’s line items.

This replaces the current pattern where all teams and all candidate tables are rendered one after another.

### Benefits

- easier to focus on one team at a time
- faster switching while entering billing rows
- less scrolling on larger invoices

## Adjustments, Note, And Cash Out

These areas stay on the invoice detail page and keep their current roles.

No workflow change is required for:

- adjustments
- invoice note
- cash out

## Data Flow

### Team Selection

Team selection is page state, not saved invoice state.

That means:

- selected team can be driven by a query param or client state
- switching teams should not mutate invoice data
- only create/remove team and add candidate actions mutate data

### Team Deletion

Deleting a team triggers a server action that removes:

- the invoice team record
- all invoice line items belonging to that team

This should happen transactionally in the store layer so there is no half-deleted state.

## Error Handling

### Add Candidate Without Team

Should be blocked in the UI and also validated server-side.

### Delete Last Team

Allowed.

After deletion:

- selected team becomes `none`
- candidate form disables
- selected-team candidate table shows empty guidance

### Selected Team Missing

If the selected team id becomes invalid after mutation:

- page should gracefully fall back to the first available team
- if none exist, fall back to no selection

## Testing

### Behavioral Tests

- selecting a team changes the active candidate workspace
- add candidate writes into selected team only
- removing a team deletes all line items under that team
- removing the selected team moves selection to the next team
- deleting the last team disables candidate form

### UI Checks

- create invoice page remains invoice-only
- invoice detail page no longer shows team dropdown inside add-candidate form
- invoice detail page renders only the selected team’s candidate table

## Scope

This redesign changes only the invoice editor workflow.

It does not introduce:

- nested tabs
- multi-step wizard behavior
- separate candidate page
- reusable team presets
- undo/restore for deleted teams

## Recommendation

Implement the redesign with:

- team cards as the primary interaction
- selected-team state in the invoice detail UI
- server action for deleting a team and its line items
- candidate form bound to current selection

This gives the cleanest billing workflow with the smallest conceptual load for the user.
