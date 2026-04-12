# Invoice Date Format MM-DD-YYYY Design

## Summary

All displayed invoice dates should use `MM-DD-YYYY` instead of `DD-MM-YYYY` or mixed locale formats. This includes invoice UI surfaces and generated invoice PDFs. Stored values should remain unchanged.

## Goals

- Standardize displayed invoice dates to `MM-DD-YYYY`.
- Apply the format consistently in invoice list views, draft/generated/sent/cashed-out invoice views, and PDFs.
- Keep form submission values and database storage unchanged.
- Normalize billing duration output in generated PDFs and default invoice-create values to the same display format.

## Non-Goals

- No database migration or stored date rewrite.
- No change to date input controls, which should stay native `type=\"date\"`.
- No changes to invoice business logic.

## Current State

- [src/features/billing/utils.ts](</D:/Eassyonboard invoice genrator and company dashboard/src/features/billing/utils.ts:1>) exposes `formatDate`, which currently uses locale output.
- [src/features/billing/pdf.ts](</D:/Eassyonboard invoice genrator and company dashboard/src/features/billing/pdf.ts:1>) has its own PDF-only date formatter and billing-duration builder using slash-separated dates.
- [app/invoices/page.tsx](</D:/Eassyonboard invoice genrator and company dashboard/app/invoices/page.tsx:1>) and [app/invoices/drafts/[id]/page.tsx](</D:/Eassyonboard invoice genrator and company dashboard/app/invoices/drafts/[id]/page.tsx:1>) render invoice dates through the shared formatter.
- [app/invoices/create/create-invoice-form.tsx](</D:/Eassyonboard invoice genrator and company dashboard/app/invoices/create/create-invoice-form.tsx:1>) builds default billing-duration strings independently.

## Proposed Change

Introduce an explicit billing date display formatter that outputs `MM-DD-YYYY` and use it everywhere invoice dates are shown.

Recommended shared behavior:

- `2026-04-15` displays as `04-15-2026`
- `Date` objects used for generated ranges also display as `MM-DD-YYYY`
- billing durations display as `MM-DD-YYYY - MM-DD-YYYY`

For existing billing-duration strings already stored with slash-based dates, normalize the displayed value when generating the PDF so the rendered invoice still matches the new standard.

## Affected Surfaces

- invoice register billing date column
- draft invoice header billing and due dates
- any generated, sent, or cashed-out invoice views that reuse those renderers
- invoice PDF:
  - invoice date
  - due date
  - fallback billing duration
  - stored billing duration display normalization
- invoice-create default billing-duration helper

## Data Handling

- Continue storing raw date fields as ISO-style strings from form submissions.
- Continue storing `billingDuration` as text.
- Convert only at render time.

## Error Handling

- If a display helper receives an invalid date string, fall back to the original input string rather than throwing in UI rendering.
- Billing-duration normalization should only rewrite recognized date tokens and otherwise preserve the original text.

## Testing

Add focused coverage for:

- shared date formatting to `MM-DD-YYYY`
- billing-duration normalization
- PDF model date fields using the new format

Run the relevant E2E flow after unit tests pass.

## Risks

- Parsing free-form billing duration text too aggressively could rewrite unexpected content, so normalization should only target recognizable date tokens.
- Using local-time parsing inconsistently can shift dates, so shared formatter behavior must stay deterministic for ISO date strings.
