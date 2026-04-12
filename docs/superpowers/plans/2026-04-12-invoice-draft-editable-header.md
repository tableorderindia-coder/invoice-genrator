# Invoice Draft Editable Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the invoice draft editor header editable for company name, invoice number, billing month/year, billing date, due date, and status without changing the rest of the draft editing flow.

**Architecture:** Add one focused invoice-header update path in the billing store and actions layer, then replace the display-only header metadata in the draft page with a compact form that submits through that new action. Keep grand total, teams, line items, notes, and PDF behaviors intact while revalidating invoice-facing routes after save.

**Tech Stack:** Next.js App Router, Server Actions, TypeScript, Supabase, Vitest

---

### Task 1: Add store-level invoice header update support

**Files:**
- Modify: `src/features/billing/store.ts`
- Test: `src/features/billing/store.test.ts`

- [ ] **Step 1: Write the failing store tests**

```ts
it("updates invoice header fields and linked company name", async () => {
  const invoiceUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
  const companyUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });

  mockSupabase.from.mockImplementation((table: string) => {
    if (table === "invoices") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            neq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        update: invoiceUpdate,
      };
    }

    if (table === "companies") {
      return {
        update: companyUpdate,
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  await updateInvoiceHeader({
    invoiceId: "invoice-1",
    companyId: "company-1",
    companyName: "The Arena Platform, Inc.",
    invoiceNumber: "INV-204",
    month: 4,
    year: 2026,
    billingDate: "2026-04-01",
    dueDate: "2026-04-15",
    status: "generated",
  });

  expect(invoiceUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      invoice_number: "INV-204",
      month: 4,
      year: 2026,
      billing_date: "2026-04-01",
      due_date: "2026-04-15",
      status: "generated",
    }),
  );
  expect(companyUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "The Arena Platform, Inc.",
    }),
  );
});

it("rejects duplicate invoice numbers for another invoice", async () => {
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === "invoices") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            neq: vi.fn().mockResolvedValue({
              data: [{ id: "invoice-2", invoice_number: "INV-204" }],
              error: null,
            }),
          }),
        }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  await expect(
    updateInvoiceHeader({
      invoiceId: "invoice-1",
      companyId: "company-1",
      companyName: "The Arena Platform, Inc.",
      invoiceNumber: "INV-204",
      month: 4,
      year: 2026,
      billingDate: "2026-04-01",
      dueDate: "2026-04-15",
      status: "draft",
    }),
  ).rejects.toThrow("Invoice number already exists.");
});
```

- [ ] **Step 2: Run the store test to verify it fails**

Run: `npx vitest run src/features/billing/store.test.ts`
Expected: FAIL because `updateInvoiceHeader` does not exist yet.

- [ ] **Step 3: Add the minimal store implementation**

```ts
export async function updateInvoiceHeader(input: {
  invoiceId: string;
  companyId: string;
  companyName: string;
  invoiceNumber: string;
  month: number;
  year: number;
  billingDate: string;
  dueDate: string;
  status: InvoiceStatus;
}) {
  const supabase = getSupabaseOrThrow();
  const normalizedInvoiceNumber = input.invoiceNumber.trim();
  const normalizedCompanyName = input.companyName.trim();

  const { data: duplicates, error: duplicateError } = await supabase
    .from("invoices")
    .select("id, invoice_number")
    .eq("invoice_number", normalizedInvoiceNumber)
    .neq("id", input.invoiceId);
  if (duplicateError) throw duplicateError;
  if ((duplicates ?? []).length > 0) {
    throw new Error("Invoice number already exists.");
  }

  const { error: invoiceError } = await supabase
    .from("invoices")
    .update({
      invoice_number: normalizedInvoiceNumber,
      month: input.month,
      year: input.year,
      billing_date: input.billingDate,
      due_date: input.dueDate,
      status: input.status,
      updated_at: nowIso(),
    })
    .eq("id", input.invoiceId);
  if (invoiceError) throw invoiceError;

  const { error: companyError } = await supabase
    .from("companies")
    .update({
      name: normalizedCompanyName,
      updated_at: nowIso(),
    })
    .eq("id", input.companyId);
  if (companyError) throw companyError;
}
```

- [ ] **Step 4: Run the store test to verify it passes**

Run: `npx vitest run src/features/billing/store.test.ts`
Expected: PASS for the new `updateInvoiceHeader` coverage.

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/store.ts src/features/billing/store.test.ts
git commit -m "feat: add invoice header update support"
```

### Task 2: Add a server action for header updates

**Files:**
- Modify: `src/features/billing/actions.ts`
- Test: `src/features/billing/actions.test.ts`

- [ ] **Step 1: Write the failing action tests**

```ts
it("updates invoice header and revalidates invoice routes", async () => {
  const formData = new FormData();
  formData.set("invoiceId", "invoice-1");
  formData.set("companyId", "company-1");
  formData.set("companyName", "The Arena Platform, Inc.");
  formData.set("invoiceNumber", "INV-204");
  formData.set("month", "4");
  formData.set("year", "2026");
  formData.set("billingDate", "2026-04-01");
  formData.set("dueDate", "2026-04-15");
  formData.set("status", "generated");
  formData.set("returnTo", "/invoices/drafts/invoice-1");

  await expect(updateInvoiceHeaderAction(formData)).rejects.toMatchObject({
    digest: expect.stringContaining("NEXT_REDIRECT"),
  });

  expect(updateInvoiceHeader).toHaveBeenCalledWith(
    expect.objectContaining({
      invoiceId: "invoice-1",
      companyId: "company-1",
      invoiceNumber: "INV-204",
      month: 4,
      year: 2026,
      billingDate: "2026-04-01",
      dueDate: "2026-04-15",
      status: "generated",
    }),
  );
  expect(revalidatePath).toHaveBeenCalledWith("/invoices/invoice-1");
  expect(revalidatePath).toHaveBeenCalledWith("/invoices/drafts/invoice-1");
  expect(revalidatePath).toHaveBeenCalledWith("/invoices");
  expect(revalidatePath).toHaveBeenCalledWith("/cashout");
  expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
});

it("rejects invalid month values before updating", async () => {
  const formData = new FormData();
  formData.set("invoiceId", "invoice-1");
  formData.set("companyId", "company-1");
  formData.set("companyName", "The Arena Platform, Inc.");
  formData.set("invoiceNumber", "INV-204");
  formData.set("month", "13");
  formData.set("year", "2026");
  formData.set("billingDate", "2026-04-01");
  formData.set("dueDate", "2026-04-15");
  formData.set("status", "draft");

  await expect(updateInvoiceHeaderAction(formData)).rejects.toMatchObject({
    digest: expect.stringContaining("NEXT_REDIRECT"),
  });

  expect(updateInvoiceHeader).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the action test to verify it fails**

Run: `npx vitest run src/features/billing/actions.test.ts`
Expected: FAIL because `updateInvoiceHeaderAction` does not exist yet.

- [ ] **Step 3: Add the minimal action implementation**

```ts
export async function updateInvoiceHeaderAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
    const companyId = getString(formData, "companyId");
    const companyName = getString(formData, "companyName").trim();
    const invoiceNumber = getString(formData, "invoiceNumber").trim();
    const month = Number.parseInt(getString(formData, "month"), 10);
    const year = Number.parseInt(getString(formData, "year"), 10);
    const billingDate = getString(formData, "billingDate");
    const dueDate = getString(formData, "dueDate");
    const status = getString(formData, "status") as InvoiceStatus;

    if (!companyId) throw new Error("Company is required.");
    if (!companyName) throw new Error("Company name is required.");
    if (!invoiceNumber) throw new Error("Invoice number is required.");
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("Month must be between 1 and 12.");
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new Error("Year must be valid.");
    }
    if (!billingDate) throw new Error("Billing date is required.");
    if (!dueDate) throw new Error("Due date is required.");
    if (!["draft", "generated", "sent", "cashed_out"].includes(status)) {
      throw new Error("Status is invalid.");
    }

    await updateInvoiceHeader({
      invoiceId,
      companyId,
      companyName,
      invoiceNumber,
      month,
      year,
      billingDate,
      dueDate,
      status,
    });

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/drafts/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/cashout");
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to update invoice header.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Invoice header updated."));
}
```

- [ ] **Step 4: Run the action test to verify it passes**

Run: `npx vitest run src/features/billing/actions.test.ts`
Expected: PASS for the new header action coverage.

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/actions.ts src/features/billing/actions.test.ts
git commit -m "feat: add invoice header update action"
```

### Task 3: Replace the draft header display with editable controls

**Files:**
- Modify: `app/invoices/drafts/[id]/page.tsx`
- Test: `tests/e2e/invoice-feedback.spec.ts`

- [ ] **Step 1: Write the failing UI assertion**

```ts
test("draft editor exposes editable header fields", async ({ page }) => {
  await page.goto("/invoices/drafts/invoice-draft-1");

  await expect(page.getByLabel("Company name")).toBeVisible();
  await expect(page.getByLabel("Invoice number")).toBeVisible();
  await expect(page.getByLabel("Billing month")).toBeVisible();
  await expect(page.getByLabel("Billing year")).toBeVisible();
  await expect(page.getByLabel("Billing date")).toBeVisible();
  await expect(page.getByLabel("Due date")).toBeVisible();
  await expect(page.getByLabel("Status")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save header" })).toBeVisible();
});
```

- [ ] **Step 2: Run the UI test to verify it fails**

Run: `npx playwright test tests/e2e/invoice-feedback.spec.ts`
Expected: FAIL because the draft header still renders display-only values.

- [ ] **Step 3: Add the editable header form**

```tsx
<GlassPanel gradient>
  <form action={updateInvoiceHeaderAction} className="space-y-6">
    <input type="hidden" name="invoiceId" value={detail.invoice.id} />
    <input type="hidden" name="companyId" value={detail.company.id} />
    <input type="hidden" name="returnTo" value={returnTo} />

    <div className="grid gap-4 lg:grid-cols-2">
      <label className="space-y-2 text-sm">
        <span>Company name</span>
        <input
          name="companyName"
          defaultValue={detail.company.name}
          className={inputClass}
        />
      </label>
      <label className="space-y-2 text-sm">
        <span>Invoice number</span>
        <input
          name="invoiceNumber"
          defaultValue={detail.invoice.invoiceNumber}
          className={inputClass}
        />
      </label>
      <label className="space-y-2 text-sm">
        <span>Billing month</span>
        <input
          name="month"
          type="number"
          min="1"
          max="12"
          defaultValue={detail.invoice.month}
          className={inputClass}
        />
      </label>
      <label className="space-y-2 text-sm">
        <span>Billing year</span>
        <input
          name="year"
          type="number"
          min="2000"
          max="2100"
          defaultValue={detail.invoice.year}
          className={inputClass}
        />
      </label>
      <label className="space-y-2 text-sm">
        <span>Billing date</span>
        <input
          name="billingDate"
          type="date"
          defaultValue={detail.invoice.billingDate}
          className={inputClass}
        />
      </label>
      <label className="space-y-2 text-sm">
        <span>Due date</span>
        <input
          name="dueDate"
          type="date"
          defaultValue={detail.invoice.dueDate}
          className={inputClass}
        />
      </label>
      <label className="space-y-2 text-sm lg:col-span-2">
        <span>Status</span>
        <select
          name="status"
          defaultValue={detail.invoice.status}
          className={inputClass}
        >
          <option value="draft">draft</option>
          <option value="generated">generated</option>
          <option value="sent">sent</option>
          <option value="cashed_out">cashed_out</option>
        </select>
      </label>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={`/api/invoices/${detail.invoice.id}/pdf`} className="btn-outline">
        Open PDF
      </Link>
      <PendingSubmitButton
        className="gradient-btn"
        defaultText="Save header"
        pendingText="Saving..."
      />
    </div>
  </form>

  <form action={updateInvoiceGrandTotalAction} className="mt-6 flex items-center gap-2">
    ...
  </form>
</GlassPanel>
```

- [ ] **Step 4: Run the UI test to verify it passes**

Run: `npx playwright test tests/e2e/invoice-feedback.spec.ts`
Expected: PASS with the editable header fields visible in the draft editor.

- [ ] **Step 5: Commit**

```bash
git add app/invoices/drafts/[id]/page.tsx tests/e2e/invoice-feedback.spec.ts
git commit -m "feat: edit invoice draft header in place"
```

### Task 4: Run focused verification and ship the feature

**Files:**
- Modify: none
- Test: `src/features/billing/store.test.ts`
- Test: `src/features/billing/actions.test.ts`
- Test: `tests/e2e/invoice-feedback.spec.ts`

- [ ] **Step 1: Run focused unit and integration tests**

Run: `npx vitest run src/features/billing/store.test.ts src/features/billing/actions.test.ts`
Expected: PASS

- [ ] **Step 2: Run the draft invoice E2E flow**

Run: `npx playwright test tests/e2e/invoice-feedback.spec.ts`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS, or only the existing known warning for `_invoiceNumbers` in `src/features/billing/employee-cash-flow-store.ts`

- [ ] **Step 4: Commit final polish if needed**

```bash
git add app/invoices/drafts/[id]/page.tsx src/features/billing/actions.ts src/features/billing/store.ts src/features/billing/actions.test.ts src/features/billing/store.test.ts tests/e2e/invoice-feedback.spec.ts
git commit -m "test: cover editable invoice draft header"
```
