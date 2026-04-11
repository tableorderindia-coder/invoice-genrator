# Operational Invoice Split Design

Date: 2026-04-07

## Goal

Separate invoice editing, invoice operations, and cashout into distinct flows so the app matches the real business workflow.

The new structure should be:

1. `Create Invoice`
2. `Draft Editor`
3. `Invoices`
4. `Cashout`
5. `Dashboard`

## Core Product Rule

Invoices are not the place for profit operations.

That means:

- no profit display inside invoice editing pages
- no cashout control inside invoice editing pages
- invoice editing is only for draft-building
- generated and sent invoices move into an operations list
- cashout is handled in a dedicated page

## Target Workflow

### 1. Create Invoice

This remains the entry point for starting invoice work.

Responsibilities:

- create a new invoice draft
- optionally duplicate a previous invoice
- redirect into the draft editor after creation

This page does not show invoice history.

### 2. Draft Editor

Only draft invoices are editable.

This page is where the admin:

- manages team sections
- adds/removes candidates
- adds adjustments
- edits invoice note
- opens PDF preview

This page does not show:

- profit
- cashout
- realized metrics

If an invoice is no longer in `draft`, it should not behave like an editing workspace anymore.

### 3. Invoices

This becomes the operational register for issued invoices.

It should show only invoices with status:

- `generated`
- `sent`

Responsibilities:

- show invoice metadata
- show company
- show billing period
- show billing date
- show total
- open invoice PDF
- mark generated
- mark sent

This page is not for editing line items.

### 4. Cashout

Cashout becomes a dedicated settlement page.

It should show invoices that are eligible to be realized, meaning invoices that have already entered the post-draft workflow and are not yet cashed out.

Recommended visible statuses here:

- `generated`
- `sent`

Responsibilities:

- list invoices ready for cashout
- show invoice number, company, dates, status, and total
- open invoice PDF
- choose realized date
- mark cashout

This page owns the cashout action.

### 5. Dashboard

Dashboard remains separate and should not be mixed into invoice operations.

It can continue showing reporting and realized outcomes, but those metrics should not appear inside invoice editing pages.

## Routing Recommendation

Use purpose-based routes:

- `/invoices/create`
- `/invoices/drafts/[id]`
- `/invoices`
- `/cashout`
- `/dashboard`

This is clearer than overloading one route with different behaviors depending on status.

## Navigation

Top navigation should reflect the actual workflow:

- `Overview`
- `Companies`
- `Employees`
- `Create Invoice`
- `Invoices`
- `Cashout`
- `Dashboard`

## Status Ownership

### Draft

- lives in draft editor
- editable

### Generated

- no longer edited in draft editor
- appears in invoice operations list
- eligible for cashout list

### Sent

- no longer edited in draft editor
- appears in invoice operations list
- eligible for cashout list

### Cashed Out

- no longer part of invoice editing
- no cashout action shown again
- available for dashboard/reporting

## Page Behavior Rules

### Draft Editor Access

If a user opens `/invoices/drafts/[id]` for a non-draft invoice:

- redirect them to `/invoices`
- or show a controlled not-editable state with a link back to invoice operations

Recommendation: redirect to `/invoices` for simplicity.

### Invoice List Access

The invoice list should not contain drafts.

Drafts belong to draft editing, not issued-invoice operations.

### Cashout List Access

The cashout page should exclude:

- drafts
- already cashed out invoices

## UI Responsibilities

### Create Invoice Page

- invoice setup form only

### Draft Editor Page

- team manager
- candidate manager
- selected-team workspace
- adjustments
- note
- PDF access

### Invoices Page

- operational list/table
- generated/sent actions
- PDF access

### Cashout Page

- settlement list/table
- cashout action

## Data Model Impact

No major schema change is required for this redesign.

This is mostly a routing and page-responsibility change.

Needed behavior changes:

- filter invoices by status on different pages
- move cashout action usage from invoice detail page to cashout page
- remove profit/cashout UI from draft editor page

## Error Handling

### Draft Opened After Status Change

If an invoice changes from `draft` to `generated` or `sent` and someone tries to open it in the draft editor:

- redirect to `/invoices`

### Cashout Repeated

If an already-cashed-out invoice appears through stale navigation:

- hide cashout action
- keep server protection against double cashout

### No Eligible Cashout Items

Cashout page should show a friendly empty state:

- `No invoices are waiting for cashout.`

## Testing

### Routing / Visibility

- create invoice route exists and works
- draft editor only works for draft invoices
- invoices page excludes drafts
- cashout page excludes drafts and cashed-out invoices

### Actions

- draft creation redirects to draft editor
- generated/sent actions work from invoices page
- cashout works only from cashout page

### UI Rules

- draft editor shows no profit card
- draft editor shows no cashout card
- invoices page is operational list only
- cashout page owns settlement action

## Scope

This redesign changes workflow structure and page ownership.

It does not introduce:

- approval workflow
- partial payments
- reopen-generated-invoice flow
- separate profit-management page

## Recommendation

Implement the split with purpose-based routes and strict page ownership:

- draft work in draft editor only
- issued invoices in invoice operations only
- cashout in its own page only

This best matches the way the user wants to operate the system and removes finance clutter from invoice creation.
