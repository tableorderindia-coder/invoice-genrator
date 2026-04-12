# Invoice Creator All Previous Invoices Design

## Summary

The invoice creator should let users duplicate from any previous invoice for the selected company, not just a single latest invoice. The duplicate action should continue to work exactly as it does today once an invoice is selected.

## Goals

- Show all previous invoices for the selected company in the `Duplicate from previous invoice` dropdown.
- Keep the current create flow and duplication behavior unchanged after selection.
- Make each dropdown option identifiable by invoice number and status.
- Keep the list ordered newest-first so recent invoices stay easiest to reach.

## Non-Goals

- No change to how invoice duplication copies teams, line items, adjustments, or notes.
- No filtering by invoice status beyond excluding impossible self-reference during creation.
- No redesign of the invoice create layout.

## Current State

- [app/invoices/create/page.tsx](</D:/Eassyonboard invoice genrator and company dashboard/app/invoices/create/page.tsx:1>) calls [findLatestInvoiceForCompany](</D:/Eassyonboard invoice genrator and company dashboard/src/features/billing/store.ts:966>) and passes a flattened `latestInvoices` prop into the form.
- [app/invoices/create/create-invoice-form.tsx](</D:/Eassyonboard invoice genrator and company dashboard/app/invoices/create/create-invoice-form.tsx:1>) renders only one import option per company.
- [createInvoiceDraft](</D:/Eassyonboard invoice genrator and company dashboard/src/features/billing/store.ts:980>) already supports duplicating from any supplied invoice id.

## Proposed Change

Replace the latest-invoice lookup used by the invoice creator with a full historical invoice list per company. The create form will receive all eligible invoices and filter them client-side by selected company, just like it currently filters the single latest option.

Each dropdown option should render:

- invoice number
- status

Recommended label format:

`INV-123 • Draft`

or

`INV-123 • Cashed out`

The default first option remains `Start empty`.

## Data Model

Add a store reader that returns all invoices for a company with the minimum fields needed by the UI:

- `id`
- `companyId`
- `invoiceNumber`
- `status`
- `month`
- `year`

Ordering should be newest-first. Prefer:

1. `year` descending
2. `month` descending
3. `created_at` descending

This keeps older invoices available while preserving sensible recency.

## UI Behavior

For the selected company:

- show every previous invoice as a dropdown option
- show `Start empty` as the blank option
- keep using the selected `duplicateSourceId` when the form submits

The UI should not block draft, sent, generated, or cashed-out invoices from appearing.

## Error Handling

- If a company has no prior invoices, the dropdown should show only `Start empty`.
- If a selected source invoice no longer exists by submit time, existing draft-creation validation should continue to raise `Source invoice not found`.

## Testing

Add focused coverage for:

- the new company invoice list reader ordering and shape
- form option rendering with mixed statuses
- preserving `duplicateSourceId` submission behavior

## Risks

- Very large invoice histories can increase dropdown length, but this is acceptable for the current workflow because the user explicitly wants full access to all historical invoices.
- Any inconsistency between dropdown labels and actual invoice status would confuse imports, so the label formatter should be centralized or kept trivial.
