# Invoice Draft Editable Header Design

## Goal

Allow the invoice draft editor to update the invoice header directly from the draft page, including:

- company name
- invoice number
- billing month
- billing year
- billing date
- due date
- status

The rest of the draft editor should keep its current structure, styling, and behavior.

## Current State

The draft editor header card shows company name, invoice month/year, billing date, due date, invoice status, and grand total. Only grand total is editable there today. Status can also be changed through the existing `Mark generated` action, but the rest of the header values are display-only.

The draft page already has stable server-action patterns for updating invoice note, line items, adjustments, team totals, grand total, and status. There is not yet a single update path for invoice header metadata.

## Proposed UX

The existing top header card in the draft editor remains the place where invoice identity is shown and edited.

Changes:

- company name becomes a text input
- invoice number becomes a text input
- billing month becomes a month selector or numeric month field
- billing year becomes a numeric year field
- billing date becomes a date input
- due date becomes a date input
- status becomes a select field

Grand total remains its own existing control in the same header card. The PDF button remains unchanged.

The card should continue to look like the current draft editor header, with only the display values replaced by editable controls and one explicit save action for the header block.

## Data Model and Update Flow

Add one new server action dedicated to saving invoice draft header metadata.

The action will:

1. validate all header inputs
2. update invoice-owned fields on `invoices`
3. update company name on the linked `companies` row
4. revalidate invoice-facing routes
5. redirect back to the draft editor with flash success or error messaging

Store-layer responsibilities:

- update invoice number with duplicate protection
- update month and year
- update billing date and due date
- update status
- update `updated_at`
- update the linked company name

The update should not modify team rows, line items, adjustments, totals, notes, or PDF generation logic beyond letting those consumers read the newly saved metadata.

## Validation Rules

- company name must not be empty
- invoice number must not be empty
- invoice number must remain unique across invoices, excluding the current invoice id
- month must be an integer from 1 to 12
- year must be a valid integer in a reasonable modern range
- billing date must be a valid date string
- due date must be a valid date string
- status must be one of `draft`, `generated`, `sent`, or `cashed_out`

If validation fails, the user stays on the draft page and sees the existing flash error pattern.

## UI and Styling Constraints

- preserve the current draft header card placement and visual language
- avoid redesigning the rest of the editor
- keep the current grand-total update control intact
- keep the existing PDF link and invoice body sections intact
- keep layout responsive and compatible with the recently added wide-table plus sticky-sidebar structure

## Route Revalidation

On successful save, revalidate:

- `/invoices/[id]`
- `/invoices/drafts/[id]`
- `/invoices`
- `/cashout`
- `/dashboard`

This keeps invoice registers, cashout flows, and dashboard references in sync with updated invoice metadata.

## Risks and Mitigations

### Invoice number collisions

Mitigation: reuse the store-level uniqueness check pattern already used at creation time, excluding the current invoice from the collision set.

### Company name edits affecting other invoices

This is expected behavior because the draft references a shared company record. The UI should save the shared company name intentionally rather than pretending it is invoice-local.

### Month and year changes affecting line-item day math

The save path should persist the new month/year values only. Existing line-item totals already normalize against invoice month and year when line items are recomputed later. This change should not auto-recompute unrelated sections during header save.

## Testing

Add focused tests for:

- successful invoice header update
- invoice number uniqueness rejection
- invalid month rejection
- company name update alongside invoice metadata update

Verify the draft page still renders edited header values correctly after save.

## Out of Scope

- changing PDF layout or adding new PDF fields
- editing teams, line items, adjustments, reimbursements, or notes beyond existing behavior
- redesigning the draft editor header
- creating company-specific rename warnings or versioning
