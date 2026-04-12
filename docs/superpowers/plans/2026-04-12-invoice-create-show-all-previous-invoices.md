# Invoice Creator All Previous Invoices Implementation Plan

## Objective

Update the invoice creator so the `Duplicate from previous invoice` field shows all previous invoices for the selected company, labeled with invoice number and status, while preserving the existing import behavior.

## Steps

1. Add a store query in [src/features/billing/store.ts](</D:/Eassyonboard invoice genrator and company dashboard/src/features/billing/store.ts:1>) that returns all invoices for a company in newest-first order with the small UI shape needed by the create page.
2. Update [app/invoices/create/page.tsx](</D:/Eassyonboard invoice genrator and company dashboard/app/invoices/create/page.tsx:1>) to fetch full per-company invoice history instead of only the latest invoice and pass that result into the form.
3. Update [app/invoices/create/create-invoice-form.tsx](</D:/Eassyonboard invoice genrator and company dashboard/app/invoices/create/create-invoice-form.tsx:1>) so the duplicate dropdown:
   - filters by selected company
   - renders all prior invoices
   - includes status in the option label
4. Add or update focused tests around invoice list ordering and create-form option rendering.
5. Run targeted verification:
   - `npx vitest run ...`
   - `npm run lint`

## Expected Outcome

- Users can import from draft, generated, sent, or cashed-out invoices.
- The dropdown remains company-specific and easy to scan.
- No changes are required to the downstream duplication logic in `createInvoiceDraft`.

## Notes

- Keep the implementation intentionally narrow: only widen the source list and label it better.
- Do not alter draft creation semantics or invoice copy depth in this task.
