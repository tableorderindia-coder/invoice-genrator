# Dashboard Column Visibility Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared eye-toggle that collapses/expands the column block between “Dollar Inward” and “Effective Dollar Inward” across Employee and Monthly/Yearly tables, without changing backend data.

**Architecture:** Introduce a small column-toggle helper that returns visible column definitions, then render table headers/cells by mapping column arrays in a client component that owns toggle state + persistence. The server page passes data and actions into the client component.

**Tech Stack:** TypeScript, React (Next.js App Router), Vitest

---

### Task 1: Add column-toggle helper + tests (TDD)

**Files:**
- Create: `src/features/billing/dashboard-column-visibility.ts`
- Create: `src/features/billing/dashboard-column-visibility.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/billing/dashboard-column-visibility.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { getVisibleToggleColumns } from "./dashboard-column-visibility";

describe("dashboard column toggle", () => {
  it("returns only dollar inward + effective dollar inward when collapsed", () => {
    const columns = getVisibleToggleColumns(false);
    expect(columns.map((col) => col.key)).toEqual([
      "dollarInward",
      "effectiveDollarInward",
    ]);
  });

  it("returns all toggle columns when expanded", () => {
    const columns = getVisibleToggleColumns(true);
    expect(columns.map((col) => col.key)).toEqual([
      "dollarInward",
      "onboardingAdvance",
      "reimbursements",
      "reimbursementLabels",
      "reimbursementsInr",
      "appraisalAdvance",
      "appraisalAdvanceInr",
      "offboardingDeduction",
      "effectiveDollarInward",
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/billing/dashboard-column-visibility.test.ts`  
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the helper**

Create `src/features/billing/dashboard-column-visibility.ts`:

```ts
export type ToggleColumnKey =
  | "dollarInward"
  | "onboardingAdvance"
  | "reimbursements"
  | "reimbursementLabels"
  | "reimbursementsInr"
  | "appraisalAdvance"
  | "appraisalAdvanceInr"
  | "offboardingDeduction"
  | "effectiveDollarInward";

export type ToggleColumn = {
  key: ToggleColumnKey;
  label: string;
};

const leftFixed: ToggleColumn[] = [
  { key: "dollarInward", label: "Dollar inward" },
];

const middleExpandable: ToggleColumn[] = [
  { key: "onboardingAdvance", label: "Onboarding advance" },
  { key: "reimbursements", label: "Reimbursements / Expenses" },
  { key: "reimbursementLabels", label: "Reimbursement labels" },
  { key: "reimbursementsInr", label: "Reimbursements (INR)" },
  { key: "appraisalAdvance", label: "Appraisal advance" },
  { key: "appraisalAdvanceInr", label: "Appraisal advance (INR)" },
  { key: "offboardingDeduction", label: "Offboarding deduction" },
];

const rightFixed: ToggleColumn[] = [
  { key: "effectiveDollarInward", label: "Effective dollar inward" },
];

export function getVisibleToggleColumns(showDetails: boolean) {
  return [
    ...leftFixed,
    ...(showDetails ? middleExpandable : []),
    ...rightFixed,
  ];
}
```

- [ ] **Step 4: Re-run the test**

Run: `npx vitest run src/features/billing/dashboard-column-visibility.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/billing/dashboard-column-visibility.ts src/features/billing/dashboard-column-visibility.test.ts
git commit -m "test: cover dashboard column toggle visibility"
```

---

### Task 2: Add client component with toggle state + persistence

**Files:**
- Create: `app/dashboard/dashboard-tables.tsx`
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Create client component skeleton**

Create `app/dashboard/dashboard-tables.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { PendingActionButton } from "../_components/pending-action-button";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { inputClass } from "../_components/field";
import type {
  PnDashboardData,
  PnEmployeeEditableRow,
  PnPeriodRow,
  PnPeriodType,
} from "@/src/features/billing/types";
import {
  formatInr,
  formatMonthYear,
  formatSignedInr,
  formatUsd,
} from "@/src/features/billing/utils";
import { getVisibleToggleColumns } from "@/src/features/billing/dashboard-column-visibility";

type DashboardTablesProps = {
  view: "employee" | "period";
  periodType: PnPeriodType;
  data: PnDashboardData;
  selectedCompanyId: string;
  returnTo: string;
  saveDashboardExpenseAction: (formData: FormData) => Promise<void>;
  updateDashboardEmployeeCashFlowEntryAction: (formData: FormData) => Promise<void>;
};

export function DashboardTables({
  view,
  periodType,
  data,
  selectedCompanyId,
  returnTo,
  saveDashboardExpenseAction,
  updateDashboardEmployeeCashFlowEntryAction,
}: DashboardTablesProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("dashboardShowDetails");
    if (saved) {
      try {
        setShowDetails(JSON.parse(saved));
      } catch {
        setShowDetails(false);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("dashboardShowDetails", JSON.stringify(showDetails));
  }, [showDetails]);

  const toggleColumns = useMemo(
    () => getVisibleToggleColumns(showDetails),
    [showDetails],
  );

  const toggleButton = (
    <button
      type="button"
      onClick={() => setShowDetails((prev) => !prev)}
      className="btn-outline"
      title="Toggle Details"
    >
      {showDetails ? "🙈 Hide details" : "👁 Show details"}
    </button>
  );

  if (view === "employee") {
    return (
      <EmployeeTables
        data={data}
        returnTo={returnTo}
        toggleColumns={toggleColumns}
        toggleButton={toggleButton}
        updateDashboardEmployeeCashFlowEntryAction={updateDashboardEmployeeCashFlowEntryAction}
      />
    );
  }

  return (
    <PeriodTables
      data={data}
      periodType={periodType}
      selectedCompanyId={selectedCompanyId}
      returnTo={returnTo}
      toggleColumns={toggleColumns}
      toggleButton={toggleButton}
      saveDashboardExpenseAction={saveDashboardExpenseAction}
    />
  );
}

// EmployeeTables and PeriodTables implemented in Task 3.
```

- [ ] **Step 2: Wire DashboardTables into page**

In `app/dashboard/page.tsx`, import and replace the inline table blocks:

```tsx
import { DashboardTables } from "./dashboard-tables";
```

Replace the `{view === "employee" ? (...) : (...)}` table rendering with:

```tsx
<DashboardTables
  view={view}
  periodType={periodType}
  data={data}
  selectedCompanyId={selectedCompanyId}
  returnTo={returnTo}
  saveDashboardExpenseAction={saveDashboardExpenseAction}
  updateDashboardEmployeeCashFlowEntryAction={updateDashboardEmployeeCashFlowEntryAction}
/>
```

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx app/dashboard/dashboard-tables.tsx
git commit -m "feat: add dashboard tables client wrapper with toggle state"
```

---

### Task 3: Render tables with column mapping and toggle block

**Files:**
- Modify: `app/dashboard/dashboard-tables.tsx`

- [ ] **Step 1: Implement Employee table column definitions**

Add column definitions that map to existing row fields, while inserting the toggle block between Dollar Inward and Effective Dollar Inward:

```tsx
const employeePrefixColumns = [
  { key: "month", label: "Month", render: (row: PnEmployeeEditableRow) => formatMonthYear(row.month, row.year) },
  // Days worked with existing input markup
];

const employeeSuffixColumns = [
  { key: "cashoutRate", label: "Cashout rate", render: (...) => ... },
  // ... keep all current columns and markup in order
  { key: "actions", label: "Actions", render: (...) => ... },
];
```

Within the render, map:

```tsx
const columns = [
  ...employeePrefixColumns,
  ...toggleColumns.map((col) => ({
    key: col.key,
    label: col.label,
    render: (row: PnEmployeeEditableRow) => toggleCellForEmployee(col.key, row),
  })),
  ...employeeSuffixColumns,
];
```

Create `toggleCellForEmployee` to return the existing input/text for those fields using `formatUsd/formatInr` as in the current table.

Ensure:
- `table` uses `className="glass-table min-w-max"`
- Header renders `columns.map`
- Body renders `columns.map`
- Total Net Profit row uses `colSpan={columns.length - 2}` to keep alignment.

- [ ] **Step 2: Implement Monthly/Yearly table column definitions**

Repeat the same pattern with `PnPeriodRow` rows:

```tsx
const periodPrefixColumns = [
  { key: "period", label: "Period", render: (row: PnPeriodRow) => periodLabel },
];

const periodSuffixColumns = [
  // existing columns after Effective Dollar Inward, including Expenses + Net P/L
];
```

Use `toggleColumns` for the middle block and map via `toggleCellForPeriod`.

Ensure:
- `table` uses `className="glass-table min-w-max"`
- Header and body map columns
- Expense form remains in the Expenses column exactly as today.

- [ ] **Step 3: Add the toggle button to each table header area**

Place `toggleButton` at the top-right of each table container, e.g.:

```tsx
<div className="mb-3 flex items-center justify-between">
  <h3>Employee</h3>
  {toggleButton}
</div>
```

Do the same in Monthly/Yearly view above the table.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/features/billing/dashboard-column-visibility.test.ts`  
Expected: PASS.

- [ ] **Step 5: Run lint**

Run: `npm run lint`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/dashboard-tables.tsx
git commit -m "feat: toggle dashboard column visibility"
```

---

### Task 4: Verify and finalize

- [ ] **Step 1: Run full test suite**

Run: `npm test`  
Expected: PASS.

- [ ] **Step 2: Push**

```bash
git push origin HEAD:main
```
