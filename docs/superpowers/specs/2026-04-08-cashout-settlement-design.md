# Cashout Settlement Design

## Goal

Extend the existing cashout workflow so settlement captures the actual money received instead of only the cashout date. When a user marks an invoice as cashed out, they must also enter the actual USD received (`Dollar inbound`) and the settlement conversion rate (`USD/INR rate`). The dashboard should then use `Dollar inbound` as realized revenue and show `Bank charges` as the difference between billed invoice total and actual USD received.

## Scope

This design changes only:

- the `Cashout` page form
- the realization data model
- realized dashboard calculations and labels

This design does **not** change:

- invoice generation
- invoice totals or PDF billing totals
- employee payout logic
- INR profit logic beyond storing the settlement rate for later use

## Current State

Today cashout records only:

- `realized_at`

The dashboard currently treats realized revenue as the invoice grand total and realized profit as a pure billing-vs-payout calculation.

That is no longer sufficient because actual receipt can differ from invoice total due to bank charges. The system needs to distinguish:

- `Billed amount`: invoice grand total
- `Dollar inbound`: actual USD received
- `Bank charges`: billed amount minus dollar inbound

## User Workflow

### Cashout page

For each eligible invoice, the row should show:

- `Cashout date`
- `Dollar inbound`
- `USD/INR rate`
- `Mark cashout`

Behavior:

- user enters all three values
- submission validates required positive values
- cashout creates a realization record with the settlement fields
- invoice status changes to `cashed_out`
- invoice disappears from the active cashout queue

### Dashboard

The dashboard should reflect settlement-aware realized values:

- realized revenue uses `Dollar inbound`
- bank charges show the total loss between billed and received
- realized profit should be based on actual inbound USD, not billed invoice total

## Data Model

### `invoice_realizations`

Add:

- `dollar_inbound_usd_cents integer not null`
- `usd_inr_rate numeric(12,4)`

Keep:

- `realized_at`
- `realized_revenue_usd_cents`
- `realized_payout_usd_cents`
- `realized_profit_usd_cents`

### Meaning of fields

- `realized_revenue_usd_cents` becomes the normalized stored copy of `dollar_inbound_usd_cents`
- `realized_profit_usd_cents` becomes:
  - `dollar_inbound_usd_cents - realized_payout_usd_cents`
- `usd_inr_rate` is stored now for future INR reporting, but the current dashboard does not need to display it
- historical realization rows created before this feature may keep `usd_inr_rate` as `null`
- all new cashout writes must provide a positive `usd_inr_rate`

## Calculation Rules

### Cashout calculations

Inputs:

- invoice billed total: `invoice.grand_total_usd_cents`
- `dollar_inbound_usd_cents`
- payout total from line items
- invoice adjustments

Derived:

- `bank_charges_usd_cents = max(invoice.grand_total_usd_cents - dollar_inbound_usd_cents, 0)` for dashboard display
- `realized_revenue_usd_cents = dollar_inbound_usd_cents`
- `realized_profit_usd_cents = dollar_inbound_usd_cents - payout_total_usd_cents`

Important:

- billed total remains the invoice history number
- cashout revenue is the actual received number
- bank charges are informational settlement loss, not a mutation of invoice totals

## Validation

### Cashout form

- `realizedAt` required
- `dollarInboundUsd` required, numeric, greater than 0
- `usdInrRate` required, numeric, greater than 0
- schema should reject zero or negative `usd_inr_rate` values even if a write bypasses the UI

### Error handling

- invalid submission should keep the user on `/cashout`
- show a clear inline or flash error
- duplicate cashout attempts remain blocked by the existing unique realization constraint

## UI Changes

### Cashout page

Add two rectangular inputs beside the existing date field:

- `Dollar inbound`
- `USD/INR rate`

The row remains inline and fast to use.

### Dashboard

Update top cards so they communicate settlement clearly. Recommended card set:

- `Draft invoices`
- `Generated`
- `Sent`
- `Realized inbound`
- `Bank charges`
- `Realized profit`

If card count needs to stay smaller for layout reasons, `Bank charges` and `Realized inbound` are the required additions, and status cards can be rearranged.

Company and employee profit sections should continue to show realized profit, but they now derive from inbound-based realization values.

## Architecture

### Store layer

The store remains the source of truth for:

- writing cashout settlement fields
- computing realization values
- aggregating dashboard metrics

### Action layer

The server action should parse the new fields and pass them to the store in normalized cents/decimal form.

### Presentation layer

- `app/cashout/page.tsx` adds the new fields
- `app/dashboard/page.tsx` updates labels and cards

## Testing

Required verification:

- cashout accepts date, dollar inbound, and USD/INR rate
- realization record stores those values correctly
- dashboard realized revenue uses inbound amount, not invoice total
- dashboard bank charges equal billed minus inbound
- cashout form rejects empty or non-positive inbound/rate values
- existing invoice and PDF flows remain unchanged

## Risks

### Schema mismatch

The app is Supabase-backed, so this change must ship with a migration before the feature is tested live.

### Misleading dashboard math

If dashboard continues to use invoice totals anywhere after this change, users will see inconsistent settlement numbers. Aggregates must be updated in one pass.

## Decision Summary

- `Dollar inbound` is the actual USD received after bank charges
- `USD/INR rate` is collected and stored at cashout time
- dashboard shows `Bank charges` only in the dashboard, not in the cashout list
- realized dashboard revenue uses `Dollar inbound`, not billed invoice total
