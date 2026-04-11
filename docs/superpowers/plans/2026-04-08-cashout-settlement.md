# Cashout Settlement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `Dollar inbound` and `USD/INR rate` to cashout, persist them on realizations, and update the dashboard to use actual inbound revenue plus bank-charge reporting.

**Architecture:** Extend the realization record instead of mutating invoices. Keep invoices as billed-history records, treat cashout as the settlement event, and move realized dashboard metrics to inbound-aware aggregates derived from `invoice_realizations`.

**Tech Stack:** Next.js App Router, Server Actions, Supabase PostgREST, TypeScript, Playwright, Vitest.

---

### File Map

**Create:**
- `docs/superpowers/specs/2026-04-08-cashout-settlement-design.md`
- `docs/superpowers/plans/2026-04-08-cashout-settlement.md`
- `supabase/migrations/2026-04-08-cashout-settlement.sql`

**Modify:**
- `src/features/billing/types.ts`
- `src/features/billing/domain.ts`
- `src/features/billing/domain.test.ts`
- `src/features/billing/store.ts`
- `src/features/billing/actions.ts`
- `app/cashout/page.tsx`
- `app/dashboard/page.tsx`
- `tests/e2e/invoice-feedback.spec.ts` or a new focused cashout spec if cleaner

---

### Task 1: Add realization settlement fields to the schema

**Files:**
- Create: `supabase/migrations/2026-04-08-cashout-settlement.sql`
- Modify: `supabase/schema.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
alter table invoice_realizations
  add column if not exists dollar_inbound_usd_cents integer,
  add column if not exists usd_inr_rate numeric(12,4);

alter table invoice_realizations
  drop constraint if exists invoice_realizations_usd_inr_rate_positive;

update invoice_realizations
set dollar_inbound_usd_cents = realized_revenue_usd_cents
where dollar_inbound_usd_cents is null;

alter table invoice_realizations
  alter column dollar_inbound_usd_cents set not null;

alter table invoice_realizations
  add constraint invoice_realizations_usd_inr_rate_positive
  check (usd_inr_rate is null or usd_inr_rate > 0);
```

- [ ] **Step 2: Mirror the same fields in the canonical schema**

Add to `invoice_realizations` in `supabase/schema.sql`:

```sql
dollar_inbound_usd_cents integer not null,
usd_inr_rate numeric(12,4) check (usd_inr_rate is null or usd_inr_rate > 0),
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/2026-04-08-cashout-settlement.sql supabase/schema.sql
git commit -m "feat: add cashout settlement fields"
```

---

### Task 2: Extend billing types and realization calculations

**Files:**
- Modify: `src/features/billing/types.ts`
- Modify: `src/features/billing/domain.ts`
- Modify: `src/features/billing/domain.test.ts`

- [ ] **Step 1: Write the failing test for inbound-based realization**

Add a test like:

```ts
it("uses dollar inbound for realized revenue and profit", () => {
  const realization = createRealizationRecord({
    invoiceId: "invoice_1",
    alreadyRealized: false,
    lineItems: [
      {
        billedTotalUsdCents: 100000,
        payoutTotalUsdCents: 70000,
        profitTotalUsdCents: 30000,
      },
    ],
    adjustmentsUsdCents: 0,
    realizedAt: "2026-04-08",
    dollarInboundUsdCents: 98000,
    usdInrRate: 83.45,
  });

  expect(realization.realizedRevenueUsdCents).toBe(98000);
  expect(realization.realizedProfitUsdCents).toBe(28000);
  expect(realization.dollarInboundUsdCents).toBe(98000);
  expect(realization.usdInrRate).toBe(83.45);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
npm test -- src/features/billing/domain.test.ts
```

Expected: FAIL because `createRealizationRecord` does not yet accept the new fields.

- [ ] **Step 3: Update the types**

In `src/features/billing/types.ts`, extend `InvoiceRealization`:

```ts
export type InvoiceRealization = {
  id: string;
  invoiceId: string;
  realizedAt: string;
  dollarInboundUsdCents: number;
  usdInrRate: number;
  realizedRevenueUsdCents: number;
  realizedPayoutUsdCents: number;
  realizedProfitUsdCents: number;
  notes?: string;
  createdAt: string;
};
```

- [ ] **Step 4: Update the realization calculator**

In `src/features/billing/domain.ts`, change the input and output:

```ts
type RealizationInput = {
  invoiceId: string;
  alreadyRealized: boolean;
  lineItems: CalculatedLineItem[];
  adjustmentsUsdCents: number;
  realizedAt: string;
  dollarInboundUsdCents: number;
  usdInrRate: number;
};
```

And compute:

```ts
return {
  invoiceId,
  realizedAt,
  dollarInboundUsdCents,
  usdInrRate,
  realizedRevenueUsdCents: dollarInboundUsdCents,
  realizedPayoutUsdCents: totals.payoutTotalUsdCents,
  realizedProfitUsdCents:
    dollarInboundUsdCents - totals.payoutTotalUsdCents,
};
```

- [ ] **Step 5: Run the focused test to verify it passes**

Run:

```bash
npm test -- src/features/billing/domain.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/billing/types.ts src/features/billing/domain.ts src/features/billing/domain.test.ts
git commit -m "feat: calculate realizations from dollar inbound"
```

---

### Task 3: Persist settlement fields through the store and action layers

**Files:**
- Modify: `src/features/billing/store.ts`
- Modify: `src/features/billing/actions.ts`

- [ ] **Step 1: Update the database row type**

In `src/features/billing/store.ts`, extend `DbInvoiceRealization`:

```ts
type DbInvoiceRealization = {
  id: string;
  invoice_id: string;
  realized_at: string;
  dollar_inbound_usd_cents: number;
  usd_inr_rate: number;
  realized_revenue_usd_cents: number;
  realized_payout_usd_cents: number;
  realized_profit_usd_cents: number;
  notes: string | null;
  created_at: string;
};
```

- [ ] **Step 2: Update the mapper**

In `mapInvoiceRealization`:

```ts
return {
  id: row.id,
  invoiceId: row.invoice_id,
  realizedAt: row.realized_at,
  dollarInboundUsdCents: row.dollar_inbound_usd_cents,
  usdInrRate: Number(row.usd_inr_rate),
  realizedRevenueUsdCents: row.realized_revenue_usd_cents,
  realizedPayoutUsdCents: row.realized_payout_usd_cents,
  realizedProfitUsdCents: row.realized_profit_usd_cents,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
};
```

- [ ] **Step 3: Update `cashOutInvoice`**

Change the signature in `src/features/billing/store.ts`:

```ts
export async function cashOutInvoice(
  invoiceId: string,
  realizedAt: string,
  dollarInboundUsdCents: number,
  usdInrRate: number,
)
```

Pass those into `createRealizationRecord`, then insert:

```ts
dollar_inbound_usd_cents: realization.dollarInboundUsdCents,
usd_inr_rate: realization.usdInrRate,
realized_revenue_usd_cents: realization.realizedRevenueUsdCents,
```

- [ ] **Step 4: Update the server action**

In `src/features/billing/actions.ts`, change `cashOutInvoiceAction`:

```ts
export async function cashOutInvoiceAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const realizedAt = getString(formData, "realizedAt");
  const dollarInboundUsd = getString(formData, "dollarInboundUsd");
  const usdInrRate = getString(formData, "usdInrRate");

  await cashOutInvoice(
    invoiceId,
    realizedAt,
    centsFromUsd(dollarInboundUsd),
    Number.parseFloat(usdInrRate),
  );

  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath("/cashout");
}
```

- [ ] **Step 5: Add basic validation**

Inside `cashOutInvoiceAction`:

```ts
if (!realizedAt) throw new Error("Cashout date is required.");
if (!(centsFromUsd(dollarInboundUsd) > 0)) {
  throw new Error("Dollar inbound must be greater than zero.");
}
if (!(Number.parseFloat(usdInrRate) > 0)) {
  throw new Error("USD/INR rate must be greater than zero.");
}
```

- [ ] **Step 6: Run targeted verification**

Run:

```bash
npm test -- src/features/billing/domain.test.ts
npm run build
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/billing/store.ts src/features/billing/actions.ts
git commit -m "feat: persist cashout settlement data"
```

---

### Task 4: Update the cashout page UI

**Files:**
- Modify: `app/cashout/page.tsx`

- [ ] **Step 1: Update the table headings**

Change headings from:

```tsx
["Invoice", "Company", "Period", "Status", "Total", "Cashout"]
```

to:

```tsx
["Invoice", "Company", "Period", "Status", "Total", "Cashout"]
```

Keep the same columns, but expand the form inside the cashout cell.

- [ ] **Step 2: Add the new inputs**

Inside the form in `app/cashout/page.tsx`, add:

```tsx
<input
  type="number"
  name="dollarInboundUsd"
  step="0.01"
  min="0"
  placeholder="Dollar inbound"
  className="min-w-36"
  style={{
    height: "44px",
    borderRadius: "14px",
    padding: "0 14px",
    border: "1px solid var(--glass-border)",
    background: "rgba(255,255,255,0.04)",
    color: "var(--text-primary)",
  }}
/>
<input
  type="number"
  name="usdInrRate"
  step="0.0001"
  min="0"
  placeholder="USD/INR rate"
  className="min-w-32"
  style={{
    height: "44px",
    borderRadius: "14px",
    padding: "0 14px",
    border: "1px solid var(--glass-border)",
    background: "rgba(255,255,255,0.04)",
    color: "var(--text-primary)",
  }}
/>
```

- [ ] **Step 3: Keep the row compact**

Use the existing inline flex layout:

```tsx
<form action={cashOutInvoiceAction} className="flex flex-wrap items-center gap-2">
```

Do not add modal behavior.

- [ ] **Step 4: Run manual smoke verification**

Run:

```bash
npm run build
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/cashout/page.tsx
git commit -m "feat: collect inbound and fx rate on cashout"
```

---

### Task 5: Update dashboard metrics and labels

**Files:**
- Modify: `src/features/billing/types.ts`
- Modify: `src/features/billing/store.ts`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Extend dashboard metric types**

In `src/features/billing/types.ts`, add:

```ts
export type DashboardMetrics = {
  invoiceStatusCounts: Record<InvoiceStatus, number>;
  pendingCashOutCount: number;
  realizedRevenueUsdCents: number;
  bankChargesUsdCents: number;
  realizedProfitUsdCents: number;
  ...
};
```

- [ ] **Step 2: Update the aggregation logic**

In `src/features/billing/store.ts`, inside `getDashboardMetrics()`:

```ts
let realizedRevenueUsdCents = 0;
let bankChargesUsdCents = 0;
let realizedProfitUsdCents = 0;
```

For each realized invoice detail:

```ts
realizedRevenueUsdCents += detail.realization.dollarInboundUsdCents;
bankChargesUsdCents += Math.max(
  detail.invoice.grandTotalUsdCents - detail.realization.dollarInboundUsdCents,
  0,
);
realizedProfitUsdCents += detail.realization.realizedProfitUsdCents;
```

- [ ] **Step 3: Update the dashboard cards**

In `app/dashboard/page.tsx`, replace the single realized card block with cards that include:

```tsx
<MetricCard label="Realized inbound" value={formatUsd(metrics.realizedRevenueUsdCents)} />
<MetricCard label="Bank charges" value={formatUsd(metrics.bankChargesUsdCents)} />
<MetricCard label="Realized profit" value={formatUsd(metrics.realizedProfitUsdCents)} />
```

Keep the status cards too; reorganize the grid if needed.

- [ ] **Step 4: Keep company and employee sections profit-based**

Do not add `USD/INR rate` to the dashboard yet.

- [ ] **Step 5: Run verification**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/billing/types.ts src/features/billing/store.ts app/dashboard/page.tsx
git commit -m "feat: show bank charges and inbound on dashboard"
```

---

### Task 6: Add focused E2E coverage for cashout settlement

**Files:**
- Modify: `tests/e2e/invoice-feedback.spec.ts`
or
- Create: `tests/e2e/cashout-settlement.spec.ts`

- [ ] **Step 1: Prefer a dedicated cashout spec**

Create `tests/e2e/cashout-settlement.spec.ts` with a flow that:

```ts
import { test, expect } from "@playwright/test";

test("cashout captures dollar inbound and updates dashboard bank charges", async ({ page }) => {
  // create company
  // create employee
  // create draft invoice
  // mark generated
  // go to cashout
  // enter realizedAt, dollarInboundUsd, usdInrRate
  // mark cashout
  // verify dashboard shows bank charges
});
```

- [ ] **Step 2: Verify the red step**

Run:

```bash
npx playwright test tests/e2e/cashout-settlement.spec.ts
```

Expected: FAIL before implementation is complete.

- [ ] **Step 3: Implement only what the failing E2E requires**

Use the previous tasks to satisfy the test, not extra feature work.

- [ ] **Step 4: Run the focused E2E**

Run:

```bash
npx playwright test tests/e2e/cashout-settlement.spec.ts
```

Expected: PASS

- [ ] **Step 5: Run final verification**

Run:

```bash
npm test
npm run lint
npm run build
npx playwright test tests/e2e/cashout-settlement.spec.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/cashout-settlement.spec.ts
git commit -m "test: cover cashout settlement flow"
```

---

### Spec Coverage Check

- Cashout now collects `Dollar inbound` and `USD/INR rate`: covered by Tasks 1, 3, 4
- Dashboard uses inbound amount for realized revenue: covered by Tasks 2, 5
- Dashboard shows bank charges: covered by Task 5
- No invoice-generation changes: preserved by plan scope
- No dashboard display for `USD/INR rate` yet: preserved by Task 5

### Placeholder Scan

No `TODO`, `TBD`, or deferred “handle later” steps are left in the plan. Commands, files, and code targets are explicit.

### Type Consistency Check

Planned names are consistent:

- `dollarInboundUsdCents`
- `usdInrRate`
- `bankChargesUsdCents`
- `realizedRevenueUsdCents`

No alternate naming is used elsewhere in the plan.

---

Plan complete and saved to `docs/superpowers/plans/2026-04-08-cashout-settlement.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
