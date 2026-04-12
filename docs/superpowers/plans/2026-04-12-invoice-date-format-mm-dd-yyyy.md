# Invoice Date Format MM-DD-YYYY Implementation Plan

## Objective

Standardize invoice date display to `MM-DD-YYYY` across invoice UI and PDFs without changing stored values or form submission behavior.

## Steps

1. Update [src/features/billing/utils.ts](</D:/Eassyonboard invoice genrator and company dashboard/src/features/billing/utils.ts:1>) with explicit `MM-DD-YYYY` formatting helpers and safe normalization for date ranges.
2. Update invoice UI surfaces that already rely on shared formatting so they automatically render the new format.
3. Update [app/invoices/create/create-invoice-form.tsx](</D:/Eassyonboard invoice genrator and company dashboard/app/invoices/create/create-invoice-form.tsx:1>) so default billing-duration values use `MM-DD-YYYY`.
4. Update [src/features/billing/pdf.ts](</D:/Eassyonboard invoice genrator and company dashboard/src/features/billing/pdf.ts:1>) to reuse the shared date formatting and normalize billing-duration display.
5. Add focused regression tests in billing utility/PDF tests.
6. Run verification:
   - focused Vitest suite
   - relevant E2E invoice flow
   - `npm run lint`
7. Push to `main` only if all verification passes.

## Expected Outcome

- Invoice dates are shown as `MM-DD-YYYY` in the app.
- Generated PDFs match the same display format.
- Existing ISO date storage and native date inputs continue to work unchanged.
