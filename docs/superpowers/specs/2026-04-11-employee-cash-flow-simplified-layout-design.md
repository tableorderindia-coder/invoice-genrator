# Employee Cash Flow Simplified Layout Design

**Goal**

Simplify `/employee-cash-flow` into one monthly employee workspace with a top `company + month + invoice` loader, aggregated editable employee cards, and employee selection controls similar to `/dashboard`.

**Approved Direction**

- Keep only top filters for `company`, `month`, and `invoice`
- Remove the separate `Invoice Cash Event` section
- Remove the separate `Monthly Employee Cash View` summary table
- Keep one employee-focused monthly view
- Show one aggregated editable card per employee for the selected month and invoice context
- Support `single`, `multiple`, and `all employees`
- Make the editable UI large, rectangular, and roomy enough to show all prefilled values clearly

**Behavior**

- Loading a company + month + invoice preloads employee cash-flow rows
- If saved `invoice_payment_employee_entries` already exist for that invoice and month, load those first
- Otherwise preload from the invoice payout and adjustment sources
- Saving employee cards must auto-create or reuse the invoice payment header so the removed `Invoice Cash Event` card is no longer required
- Employee cards remain fully editable and continue writing only to the new cash-flow layer

**UI Structure**

1. Top filter card
   - Company
   - Month
   - Cashed-out invoice
   - Load

2. Employee filter card
   - Multi-select employees
   - Select-all toggle

3. Editable employee monthly cards
   - One card per employee
   - Aggregated monthly values
   - All important money/rate/status fields visible and editable

**Constraints**

- Do not change old dashboard, invoice, or P&L behavior
- Keep using the new cash-flow tables and isolated store/actions
- Preserve current save semantics for salary snapshots and cash-flow entries
