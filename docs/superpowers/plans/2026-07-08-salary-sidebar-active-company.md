# Salary Sidebar Active Company Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved EassyOnboard portal upgrade: company-scoped access control, collapsible sidebar, global active company selector, Salary monthly payroll review, and Salary-prefilled Employee Cash Flow.

**Architecture:** Keep the existing `admin | user` role model and add company access as an additional permission dimension. Treat `employee_salary_payments` as the monthly payroll record by extending it with review, adjustment, override, status, and audit support. Salary owns payroll values; Employee Cash Flow links payroll to invoice/payment entries and can make audited final admin overrides.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres/RLS, server actions, Vitest, Testing Library, Tailwind CSS v4, lucide-react.

---

## File Map

- Modify `lib/auth/authorization.ts`: add `salary` page, company-access pure helpers, redirect priority.
- Modify `src/lib/auth/authorization.test.ts`: tests for Salary page registry and company access helpers.
- Modify `lib/auth/server.ts`: load company access in auth context and add company-aware require helpers.
- Modify `lib/auth/actions.ts`: sync selected company access from Admin Users forms.
- Modify `src/lib/auth/actions.test.ts`: cover company access sync failure and form parsing.
- Modify `app/admin/users/page.tsx`: load companies and company access rows, render company access controls.
- Create `app/admin/users/_components/company-access-picker.tsx`: searchable checklist for company assignment.
- Modify `supabase/schema.sql`: add `salary` permission, `user_company_access`, payroll columns, payroll audit, payroll month status, RLS.
- Add migration `supabase/migrations/20260708130000_salary_company_access_payroll.sql`: idempotent schema/RLS changes.
- Create `src/features/billing/company-access.ts`: company access store helpers.
- Create `src/features/billing/payroll.ts`: pure monthly payroll calculations, status resolution, payload parsing helpers.
- Create `src/features/billing/payroll-store.ts`: Supabase loaders/mutations for Salary and payroll audit.
- Create `src/features/billing/payroll.test.ts`: pure payroll behavior tests.
- Create `src/features/billing/payroll-store.test.ts`: mocked store mutation tests.
- Modify `src/features/billing/actions.ts`: Salary save action and cash-flow payroll override behavior.
- Create `app/_components/app-sidebar.tsx`: collapsible desktop/mobile sidebar.
- Create `app/_components/active-company-selector.tsx`: client global company selector.
- Create `app/_components/shell-client.tsx`: client shell state for sidebar/company navigation.
- Modify `app/_components/shell.tsx`: server wrapper that passes auth/page/company data to client shell.
- Create `src/features/billing/active-company.ts`: URL and cookie/local storage key helpers.
- Create `src/features/billing/active-company.test.ts`: active company state tests.
- Create `app/salary/page.tsx`: Salary page server loader and layout.
- Create `app/salary/_components/salary-table.tsx`: table/filter/edit drawer/save month UI.
- Create `src/features/billing/salary-render.test.tsx`: Salary table render tests.
- Modify `app/employee-cash-flow/page.tsx`: remove local company selector and source rows from payroll.
- Modify `app/employee-cash-flow/_components/employee-cash-flow-entry-form.tsx`: mark Salary values, require override note when payroll fields change.
- Modify `src/features/billing/employee-cash-flow-store.ts`: prefill from payroll records and write override back to payroll.
- Modify focused existing tests under `src/features/billing/*employee-cash-flow*.test.ts`.

## Task 1: Company Access And Salary Page Registry

**Files:**
- Modify: `lib/auth/authorization.ts`
- Modify: `src/lib/auth/authorization.test.ts`
- Modify: `supabase/schema.sql`
- Add: `supabase/migrations/20260708130000_salary_company_access_payroll.sql`

- [ ] **Step 1: Write failing authorization tests**

Add tests to `src/lib/auth/authorization.test.ts`:

```ts
import {
  canAccessCompany,
  canAccessPage,
  getDefaultRedirectPath,
  normalizePermissionPage,
  type AppPermission,
} from "./authorization";

it("registers salary as a page permission and prioritizes it after employee cash flow", () => {
  expect(normalizePermissionPage("salary")).toBe("salary");
  expect(
    getDefaultRedirectPath({
      role: "user",
      permissions: [buildPermission({ page: "salary", canView: true })],
      mustChangePassword: false,
    }),
  ).toBe("/salary");
});

it("checks company access for admins and assigned users", () => {
  expect(
    canAccessCompany({
      role: "admin",
      companyId: "company_ntt",
      companyAccess: [],
    }),
  ).toBe(true);

  expect(
    canAccessCompany({
      role: "user",
      companyId: "company_ntt",
      companyAccess: ["company_ntt"],
    }),
  ).toBe(true);

  expect(
    canAccessCompany({
      role: "user",
      companyId: "company_ntt",
      companyAccess: ["company_wizard"],
    }),
  ).toBe(false);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- src/lib/auth/authorization.test.ts`

Expected: fails because `salary` and `canAccessCompany` do not exist yet.

- [ ] **Step 3: Implement page registry and pure company helper**

Update `lib/auth/authorization.ts`:

```ts
export const APP_PAGES = [
  { id: "overview", label: "Overview", path: "/" },
  { id: "companies", label: "Companies", path: "/companies" },
  { id: "employees", label: "Employees", path: "/employees" },
  { id: "invoices", label: "Invoices", path: "/invoices" },
  { id: "cashout", label: "Cashout", path: "/cashout" },
  { id: "employee-cash-flow", label: "Employee Cash Flow", path: "/employee-cash-flow" },
  { id: "employee-statements", label: "Employee Statements", path: "/employee-statements" },
  { id: "salary", label: "Salary", path: "/salary" },
  { id: "expenses", label: "Expenses", path: "/expenses" },
  { id: "dashboard", label: "Dashboard", path: "/dashboard" },
  { id: "admin-users", label: "Admin Users", path: "/admin/users" },
] as const;

export function canAccessCompany(input: {
  role: AppRole;
  companyId: string;
  companyAccess: string[];
}) {
  if (input.role === "admin") return true;
  return input.companyAccess.includes(input.companyId);
}
```

In `getDefaultRedirectPath`, add `"salary"` after `"employee-cash-flow"` in `redirectPriority`.

- [ ] **Step 4: Add schema and migration**

In `supabase/schema.sql`, add `salary` to the `permissions.page` check list and create:

```sql
create table if not exists public.user_company_access (
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id text not null references public.companies (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, company_id)
);
```

Create migration `supabase/migrations/20260708130000_salary_company_access_payroll.sql` with:

```sql
alter table public.permissions
  drop constraint if exists permissions_page_check;

alter table public.permissions
  add constraint permissions_page_check check (
    page in (
      'overview',
      'companies',
      'employees',
      'invoices',
      'cashout',
      'employee-cash-flow',
      'employee-statements',
      'salary',
      'expenses',
      'dashboard',
      'admin-users'
    )
  );

create table if not exists public.user_company_access (
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id text not null references public.companies (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, company_id)
);

grant select, insert, update, delete on public.user_company_access to authenticated;
alter table public.user_company_access enable row level security;

drop policy if exists "user_company_access_select" on public.user_company_access;
create policy "user_company_access_select"
on public.user_company_access
for select
to authenticated
using ((select private.is_admin()) or user_id = (select auth.uid()));

drop policy if exists "user_company_access_modify" on public.user_company_access;
create policy "user_company_access_modify"
on public.user_company_access
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
```

- [ ] **Step 5: Run focused verification**

Run: `npm test -- src/lib/auth/authorization.test.ts`

Expected: all authorization tests pass.

- [ ] **Step 6: Commit**

```powershell
git add lib/auth/authorization.ts src/lib/auth/authorization.test.ts supabase/schema.sql supabase/migrations/20260708130000_salary_company_access_payroll.sql
git commit -m "feat: add salary page and company access registry"
```

## Task 2: Company-Aware Auth Context And Admin Assignment UI

**Files:**
- Modify: `lib/auth/server.ts`
- Modify: `lib/auth/actions.ts`
- Modify: `src/lib/auth/actions.test.ts`
- Modify: `app/admin/users/page.tsx`
- Create: `app/admin/users/_components/company-access-picker.tsx`

- [ ] **Step 1: Write failing action test for company access sync**

Add to `src/lib/auth/actions.test.ts`:

```ts
it("syncs selected company access when updating a managed user", async () => {
  const profileUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const permissionsDeleteEq = vi.fn().mockResolvedValue({ error: null });
  const permissionsInsert = vi.fn().mockResolvedValue({ error: null });
  const companyDeleteEq = vi.fn().mockResolvedValue({ error: null });
  const companyInsert = vi.fn().mockResolvedValue({ error: null });

  const fromMock = vi.fn((table: string) => {
    if (table === "profiles") {
      return { update: () => ({ eq: profileUpdateEq }) };
    }
    if (table === "permissions") {
      return {
        delete: () => ({ eq: permissionsDeleteEq }),
        insert: permissionsInsert,
      };
    }
    if (table === "user_company_access") {
      return {
        delete: () => ({ eq: companyDeleteEq }),
        insert: companyInsert,
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  requireAdminAccessMock.mockResolvedValue({ supabase: { from: fromMock } });

  const { updateManagedUserAccessAction } = await import("@/lib/auth/actions");
  const formData = new FormData();
  formData.set("userId", "user_1");
  formData.set("role", "user");
  formData.set("companyAccess", "company_a");
  formData.set("companyAccess", "company_b");

  await expect(updateManagedUserAccessAction(formData)).rejects.toThrow(
    "REDIRECT:/admin/users?success=Access+updated",
  );

  expect(companyInsert).toHaveBeenCalledWith([
    { user_id: "user_1", company_id: "company_a" },
    { user_id: "user_1", company_id: "company_b" },
  ]);
});
```

- [ ] **Step 2: Run focused test and verify failure**

Run: `npm test -- src/lib/auth/actions.test.ts`

Expected: fails because company access parsing/sync is not implemented.

- [ ] **Step 3: Implement auth context company access**

In `lib/auth/server.ts`, add to `AuthContext`:

```ts
companyAccess: string[];
```

After permission loading, query:

```ts
const { data: companyAccessRows, error: companyAccessError } = await supabase
  .from("user_company_access")
  .select("company_id")
  .eq("user_id", user.id);

if (companyAccessError) return null;

const companyAccess = (companyAccessRows ?? []).map((row) =>
  String((row as { company_id: string }).company_id),
);
```

Return `companyAccess`.

Add helpers:

```ts
export async function requireCompanyPageAccess(page: AppPage, companyId: string) {
  const context = await requirePageAccess(page);
  if (!canAccessCompany({ role: context.profile.role, companyId, companyAccess: context.companyAccess })) {
    redirect("/unauthorized");
  }
  return context;
}

export async function requireCompanyPageEditAccess(page: AppPage, companyId: string) {
  const context = await requirePageEditAccess(page);
  if (!canAccessCompany({ role: context.profile.role, companyId, companyAccess: context.companyAccess })) {
    redirect("/unauthorized");
  }
  return context;
}
```

- [ ] **Step 4: Implement company access sync action**

In `lib/auth/actions.ts`, add:

```ts
function getSelectedCompanyIds(formData: FormData) {
  return [...new Set(formData.getAll("companyAccess").map((value) => String(value).trim()).filter(Boolean))];
}

async function syncCompanyAccess(input: {
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
  userId: string;
  companyIds: string[];
}) {
  const { error: deleteError } = await input.supabase
    .from("user_company_access")
    .delete()
    .eq("user_id", input.userId);
  if (deleteError) throw deleteError;

  if (input.companyIds.length === 0) return;

  const { error: insertError } = await input.supabase
    .from("user_company_access")
    .insert(input.companyIds.map((companyId) => ({
      user_id: input.userId,
      company_id: companyId,
    })));
  if (insertError) throw insertError;
}
```

Call `syncCompanyAccess` after `syncPermissions` in create and update actions.

- [ ] **Step 5: Add Admin Users company UI**

Create `app/admin/users/_components/company-access-picker.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";

type CompanyOption = { id: string; name: string };

export function CompanyAccessPicker({
  companies,
  defaultCompanyIds = [],
  disabled = false,
}: {
  companies: CompanyOption[];
  defaultCompanyIds?: string[];
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(defaultCompanyIds));
  const visibleCompanies = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return companies;
    return companies.filter((company) => company.name.toLowerCase().includes(normalized));
  }, [companies, query]);

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full min-w-0 rounded-2xl border px-4 py-3 text-sm leading-5"
        placeholder="Search companies"
        disabled={disabled}
      />
      <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border p-3" style={{ borderColor: "var(--glass-border)" }}>
        {visibleCompanies.map((company) => {
          const checked = selected.has(company.id);
          return (
            <label key={company.id} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                name="companyAccess"
                value={company.id}
                checked={checked}
                disabled={disabled}
                onChange={(event) => {
                  setSelected((current) => {
                    const next = new Set(current);
                    if (event.currentTarget.checked) next.add(company.id);
                    else next.delete(company.id);
                    return next;
                  });
                }}
              />
              <span>{company.name}</span>
            </label>
          );
        })}
        {visibleCompanies.length === 0 ? (
          <p className="px-3 py-4 text-sm" style={{ color: "var(--text-muted)" }}>
            No companies match this search.
          </p>
        ) : null}
      </div>
    </div>
  );
}
```

In `app/admin/users/page.tsx`, query `companies` and `user_company_access`, build `companyAccessByUserId`, and render `CompanyAccessPicker`. Disable it for admin profiles with text: "Admins can access all companies."

- [ ] **Step 6: Run focused tests**

Run:

```powershell
npm test -- src/lib/auth/actions.test.ts src/lib/auth/authorization.test.ts
```

Expected: pass.

- [ ] **Step 7: Commit**

```powershell
git add lib/auth/server.ts lib/auth/actions.ts src/lib/auth/actions.test.ts app/admin/users/page.tsx app/admin/users/_components/company-access-picker.tsx
git commit -m "feat: manage company access for users"
```

## Task 3: Monthly Payroll Domain, Store, Schema, And Audit

**Files:**
- Create: `src/features/billing/payroll.ts`
- Create: `src/features/billing/payroll.test.ts`
- Create: `src/features/billing/payroll-store.ts`
- Create: `src/features/billing/payroll-store.test.ts`
- Modify: `src/features/billing/types.ts`
- Modify: `src/features/billing/actions.ts`
- Modify: `supabase/schema.sql`
- Modify: `supabase/migrations/20260708130000_salary_company_access_payroll.sql`

- [ ] **Step 1: Write payroll domain tests**

Create `src/features/billing/payroll.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  calculatePayrollNetPayableInrCents,
  resolvePayrollRowStatus,
  buildPayrollDraftFromEmployee,
} from "./payroll";

describe("payroll domain", () => {
  it("calculates net payable from actual salary, PF, TDS, and adjustments", () => {
    expect(
      calculatePayrollNetPayableInrCents({
        actualSalaryInrCents: 6500000,
        pfInrCents: 180000,
        tdsInrCents: 400000,
        bonusInrCents: 500000,
        reimbursementInrCents: 100000,
        otherDeductionInrCents: 200000,
        adjustmentInrCents: -50000,
      }),
    ).toBe(6200000);
  });

  it("marks changed rows when monthly values differ from source snapshots", () => {
    expect(
      resolvePayrollRowStatus({
        isVerified: false,
        isLocked: false,
        hasAdminOverride: false,
        hasChanges: true,
      }),
    ).toBe("changed");
  });

  it("builds a monthly draft from employee defaults without mutating master data", () => {
    const draft = buildPayrollDraftFromEmployee({
      employeeId: "emp_1",
      companyId: "company_1",
      payrollMonth: "2026-07",
      employeeName: "Rahul",
      defaultActualPaidInrCents: 6500000,
      defaultPfInrCents: 180000,
      defaultTdsInrCents: 400000,
      defaultPaidUsdInrRate: 85,
    });
    expect(draft.actualSalaryInrCents).toBe(6500000);
    expect(draft.sourceActualSalaryInrCents).toBe(6500000);
    expect(draft.status).toBe("draft");
  });
});
```

- [ ] **Step 2: Run failing payroll tests**

Run: `npm test -- src/features/billing/payroll.test.ts`

Expected: fails because `payroll.ts` does not exist.

- [ ] **Step 3: Implement payroll domain**

Create `src/features/billing/payroll.ts`:

```ts
export type PayrollRowStatus =
  | "draft"
  | "changed"
  | "verified"
  | "needs_review"
  | "admin_override"
  | "locked";

export type PayrollDraft = {
  employeeId: string;
  companyId: string;
  payrollMonth: string;
  employeeName: string;
  sourceActualSalaryInrCents: number;
  sourcePfInrCents: number;
  sourceTdsInrCents: number;
  sourcePaidUsdInrRate: number;
  actualSalaryInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
  bonusInrCents: number;
  reimbursementInrCents: number;
  otherDeductionInrCents: number;
  adjustmentInrCents: number;
  netPayableInrCents: number;
  status: PayrollRowStatus;
};

export function calculatePayrollNetPayableInrCents(input: {
  actualSalaryInrCents: number;
  pfInrCents: number;
  tdsInrCents: number;
  bonusInrCents: number;
  reimbursementInrCents: number;
  otherDeductionInrCents: number;
  adjustmentInrCents: number;
}) {
  return (
    input.actualSalaryInrCents -
    input.pfInrCents -
    input.tdsInrCents +
    input.bonusInrCents +
    input.reimbursementInrCents -
    input.otherDeductionInrCents +
    input.adjustmentInrCents
  );
}

export function resolvePayrollRowStatus(input: {
  isVerified: boolean;
  isLocked: boolean;
  hasAdminOverride: boolean;
  hasChanges: boolean;
}): PayrollRowStatus {
  if (input.isLocked) return "locked";
  if (input.hasAdminOverride) return "admin_override";
  if (input.isVerified) return "verified";
  if (input.hasChanges) return "changed";
  return "draft";
}

export function buildPayrollDraftFromEmployee(input: {
  employeeId: string;
  companyId: string;
  payrollMonth: string;
  employeeName: string;
  defaultActualPaidInrCents: number;
  defaultPfInrCents: number;
  defaultTdsInrCents: number;
  defaultPaidUsdInrRate: number;
}): PayrollDraft {
  const base = {
    employeeId: input.employeeId,
    companyId: input.companyId,
    payrollMonth: input.payrollMonth,
    employeeName: input.employeeName,
    sourceActualSalaryInrCents: input.defaultActualPaidInrCents,
    sourcePfInrCents: input.defaultPfInrCents,
    sourceTdsInrCents: input.defaultTdsInrCents,
    sourcePaidUsdInrRate: input.defaultPaidUsdInrRate,
    actualSalaryInrCents: input.defaultActualPaidInrCents,
    pfInrCents: input.defaultPfInrCents,
    tdsInrCents: input.defaultTdsInrCents,
    bonusInrCents: 0,
    reimbursementInrCents: 0,
    otherDeductionInrCents: 0,
    adjustmentInrCents: 0,
  };
  return {
    ...base,
    netPayableInrCents: calculatePayrollNetPayableInrCents(base),
    status: "draft",
  };
}
```

- [ ] **Step 4: Extend schema migration for payroll**

Append to the migration:

```sql
alter table public.employee_salary_payments
  add column if not exists source_actual_salary_inr_cents bigint not null default 0,
  add column if not exists source_pf_inr_cents bigint not null default 0,
  add column if not exists source_tds_inr_cents bigint not null default 0,
  add column if not exists source_paid_usd_inr_rate numeric(12,4) not null default 0,
  add column if not exists actual_salary_inr_cents bigint not null default 0,
  add column if not exists pf_inr_cents bigint not null default 0,
  add column if not exists tds_inr_cents bigint not null default 0,
  add column if not exists bonus_inr_cents bigint not null default 0,
  add column if not exists reimbursement_inr_cents bigint not null default 0,
  add column if not exists other_deduction_inr_cents bigint not null default 0,
  add column if not exists adjustment_inr_cents bigint not null default 0,
  add column if not exists adjustment_reason text,
  add column if not exists net_payable_inr_cents bigint not null default 0,
  add column if not exists payroll_status text not null default 'draft',
  add column if not exists verified_by uuid references public.profiles(id),
  add column if not exists verified_at timestamptz,
  add column if not exists admin_override_note text,
  add column if not exists admin_override_by uuid references public.profiles(id),
  add column if not exists admin_override_at timestamptz;

alter table public.employee_salary_payments
  drop constraint if exists employee_salary_payments_payroll_status_check;

alter table public.employee_salary_payments
  add constraint employee_salary_payments_payroll_status_check check (
    payroll_status in ('draft', 'changed', 'verified', 'needs_review', 'admin_override', 'locked')
  );

create table if not exists public.payroll_month_statuses (
  company_id text not null references public.companies(id) on delete cascade,
  payroll_month text not null check (payroll_month ~ '^\d{4}-\d{2}$'),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'verified')),
  updated_at timestamptz not null default now(),
  primary key (company_id, payroll_month)
);

create table if not exists public.payroll_audit_entries (
  id text primary key,
  payroll_id text not null references public.employee_salary_payments(id) on delete cascade,
  company_id text not null references public.companies(id) on delete cascade,
  employee_id text not null references public.employees(id) on delete cascade,
  payroll_month text not null check (payroll_month ~ '^\d{4}-\d{2}$'),
  field_name text not null,
  old_value text,
  new_value text,
  reason text not null,
  change_source text not null check (change_source in ('ca_edit', 'admin_override', 'employee_master_update')),
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now()
);
```

Also add RLS policies for `employee_salary_payments`, `payroll_month_statuses`, and `payroll_audit_entries` using Salary, Employee Cash Flow, and Dashboard view/edit page permissions plus company access. The policies must use private helpers and `user_company_access`.

- [ ] **Step 5: Implement payroll store skeleton with tests**

Create `src/features/billing/payroll-store.test.ts` with a mocked Supabase client to verify that `savePayrollMonth` writes audit rows when fields change. Implement `src/features/billing/payroll-store.ts` with:

```ts
export async function listPayrollRows(input: {
  companyId: string;
  payrollMonth: string;
}): Promise<PayrollDraft[]> {
  const employees = await listActiveEmployeesForPayroll(input.companyId);
  const existingRows = await listExistingPayrollRows(input);
  return mergeEmployeesWithPayrollRows({ employees, existingRows, payrollMonth: input.payrollMonth });
}

export async function savePayrollMonth(input: {
  companyId: string;
  payrollMonth: string;
  changedBy: string;
  rows: PayrollSaveRow[];
}): Promise<void> {
  for (const row of input.rows) {
    const previous = await findPayrollRow({
      companyId: input.companyId,
      employeeId: row.employeeId,
      payrollMonth: input.payrollMonth,
    });
    const saved = await upsertPayrollRow({ ...input, row, previous });
    await insertPayrollAuditEntries({ previous, saved, changedBy: input.changedBy, reason: row.adjustmentReason || row.notes || "Salary month saved", changeSource: row.updateEmployeeMaster ? "employee_master_update" : "ca_edit" });
    if (row.updateEmployeeMaster) {
      await updateEmployeeMasterFromPayrollRow({ companyId: input.companyId, row });
    }
  }
  await refreshPayrollMonthStatus({ companyId: input.companyId, payrollMonth: input.payrollMonth });
}

export async function applyPayrollAdminOverride(input: {
  payrollId: string;
  changedBy: string;
  reason: string;
  values: PayrollOverrideValues;
}): Promise<void> {
  const previous = await findPayrollRowById(input.payrollId);
  const saved = await updatePayrollRowAsAdminOverride(input);
  await insertPayrollAuditEntries({ previous, saved, changedBy: input.changedBy, reason: input.reason, changeSource: "admin_override" });
}
```

Use `nextId("payroll")` and `nextId("payroll_audit")` local helpers matching existing ID style.

- [ ] **Step 6: Add Salary server action**

In `src/features/billing/actions.ts`, add:

```ts
export async function savePayrollMonthAction(formData: FormData) {
  const companyId = getString(formData, "companyId");
  const context = await requireCompanyPageEditAccess("salary", companyId);
  const payrollMonth = getString(formData, "payrollMonth");
  const rowsJson = getString(formData, "rowsJson");
  const rows = parsePayrollRowsJson(rowsJson);
  await savePayrollMonth({ companyId, payrollMonth, changedBy: context.userId, rows });
  revalidatePath("/salary");
  revalidatePath("/employee-cash-flow");
  redirect(`/salary?companyId=${encodeURIComponent(companyId)}&payrollMonth=${encodeURIComponent(payrollMonth)}&flashStatus=success&flashMessage=Payroll+saved`);
}
```

- [ ] **Step 7: Run focused tests**

Run:

```powershell
npm test -- src/features/billing/payroll.test.ts src/features/billing/payroll-store.test.ts
npx tsc --noEmit
```

Expected: focused tests pass and TypeScript passes.

- [ ] **Step 8: Commit**

```powershell
git add src/features/billing/payroll.ts src/features/billing/payroll.test.ts src/features/billing/payroll-store.ts src/features/billing/payroll-store.test.ts src/features/billing/actions.ts supabase/schema.sql supabase/migrations/20260708130000_salary_company_access_payroll.sql
git commit -m "feat: add monthly payroll model"
```

## Task 4: Sidebar Shell And Active Company Selector

**Files:**
- Create: `app/_components/app-sidebar.tsx`
- Create: `app/_components/active-company-selector.tsx`
- Create: `app/_components/shell-client.tsx`
- Modify: `app/_components/shell.tsx`
- Create: `src/features/billing/active-company.ts`
- Create: `src/features/billing/active-company.test.ts`

- [ ] **Step 1: Read Next.js docs before shell changes**

Run:

```powershell
Get-ChildItem -Recurse node_modules\next\dist\docs -Filter '*.md' | Select-String -Pattern 'cookies|server actions|use client|Link|redirect|refresh' -List | Select-Object -First 10 Path
```

Read the relevant docs returned for cookies/navigation boundaries before changing shell routing.

- [ ] **Step 2: Write active company tests**

Create `src/features/billing/active-company.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveActiveCompanyId, buildCompanyScopedHref } from "./active-company";

describe("active company helpers", () => {
  it("uses URL value when allowed", () => {
    expect(resolveActiveCompanyId({ requestedCompanyId: "b", savedCompanyId: "a", allowedCompanyIds: ["a", "b"] })).toBe("b");
  });

  it("falls back to saved value then first allowed company", () => {
    expect(resolveActiveCompanyId({ requestedCompanyId: "x", savedCompanyId: "a", allowedCompanyIds: ["a", "b"] })).toBe("a");
    expect(resolveActiveCompanyId({ requestedCompanyId: undefined, savedCompanyId: undefined, allowedCompanyIds: ["b"] })).toBe("b");
  });

  it("adds companyId to scoped hrefs", () => {
    expect(buildCompanyScopedHref("/salary", "company_1")).toBe("/salary?companyId=company_1");
    expect(buildCompanyScopedHref("/salary?payrollMonth=2026-07", "company_1")).toBe("/salary?payrollMonth=2026-07&companyId=company_1");
  });
});
```

- [ ] **Step 3: Implement helpers**

Create `src/features/billing/active-company.ts`:

```ts
export const ACTIVE_COMPANY_STORAGE_KEY = "eassyonboard.activeCompanyId";

export function resolveActiveCompanyId(input: {
  requestedCompanyId?: string;
  savedCompanyId?: string;
  allowedCompanyIds: string[];
}) {
  if (input.requestedCompanyId && input.allowedCompanyIds.includes(input.requestedCompanyId)) {
    return input.requestedCompanyId;
  }
  if (input.savedCompanyId && input.allowedCompanyIds.includes(input.savedCompanyId)) {
    return input.savedCompanyId;
  }
  return input.allowedCompanyIds[0] ?? "";
}

export function buildCompanyScopedHref(href: string, companyId: string) {
  if (!companyId) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("companyId", companyId);
  const nextQuery = params.toString();
  return nextQuery ? `${path}?${nextQuery}` : path;
}
```

- [ ] **Step 4: Implement client shell components**

Create `app/_components/app-sidebar.tsx` using lucide-react icons: `LayoutDashboard`, `Building2`, `Users`, `FilePlus2`, `Files`, `Wallet`, `Activity`, `FileText`, `IndianRupee`, `Receipt`, `BarChart3`, `Landmark`, `Shield`, `LogOut`, `Menu`, `ChevronLeft`, `ChevronRight`.

Create `app/_components/active-company-selector.tsx` with a searchable popover-style dropdown using existing dark input classes. It should call `router.push(buildCompanyScopedHref(pathname + search, selectedCompanyId))` and store the value in `localStorage`.

Create `app/_components/shell-client.tsx` that holds:

- `collapsed` state from localStorage
- mobile drawer state
- filtered nav groups passed from server
- content wrapper margin of `lg:pl-[260px]` or `lg:pl-[72px]`
- top bar with title, eyebrow, mobile menu button, and active company selector

- [ ] **Step 5: Modify server shell wrapper**

In `app/_components/shell.tsx`, replace the horizontal nav with a server component that calls `getAuthContext()` and `listCompanies()` or a company-access-filtered loader. Pass only allowed nav items and allowed companies into `ShellClient`.

Preserve the existing API:

```tsx
export function Shell({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  // server wrapper returns <ShellClient ...>{children}</ShellClient>
}
```

If `getAuthContext()` returns null, pass no nav items and no companies so login pages can still render.

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```powershell
npm test -- src/features/billing/active-company.test.ts
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 7: Commit**

```powershell
git add app/_components/app-sidebar.tsx app/_components/active-company-selector.tsx app/_components/shell-client.tsx app/_components/shell.tsx src/features/billing/active-company.ts src/features/billing/active-company.test.ts
git commit -m "feat: add sidebar shell and active company selector"
```

## Task 5: Salary Page UI And Save Month Flow

**Files:**
- Create: `app/salary/page.tsx`
- Create: `app/salary/_components/salary-table.tsx`
- Create: `src/features/billing/salary-render.test.tsx`
- Modify: `src/features/billing/actions.ts`

- [ ] **Step 1: Write Salary render test**

Create `src/features/billing/salary-render.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SalaryTable from "@/app/salary/_components/salary-table";

describe("SalaryTable", () => {
  it("renders payroll rows with changed deltas and save month payload", () => {
    const html = renderToStaticMarkup(
      <SalaryTable
        companyId="company_1"
        payrollMonth="2026-07"
        rows={[
          {
            id: "payroll_1",
            employeeId: "emp_1",
            employeeName: "Rahul",
            sourceActualSalaryInrCents: 6500000,
            actualSalaryInrCents: 7000000,
            sourcePfInrCents: 180000,
            pfInrCents: 180000,
            sourceTdsInrCents: 400000,
            tdsInrCents: 420000,
            bonusInrCents: 0,
            reimbursementInrCents: 0,
            otherDeductionInrCents: 0,
            adjustmentInrCents: 0,
            adjustmentReason: "Increment",
            notes: "",
            netPayableInrCents: 6400000,
            status: "changed",
            verifiedAt: null,
          },
        ]}
      />,
    );
    expect(html).toContain("Rahul");
    expect(html).toContain("Changed from");
    expect(html).toContain("Save Month");
  });
});
```

- [ ] **Step 2: Run failing render test**

Run: `npm test -- src/features/billing/salary-render.test.tsx`

Expected: fails because the component does not exist.

- [ ] **Step 3: Create Salary page**

Create `app/salary/page.tsx`:

```tsx
import { Shell } from "@/app/_components/shell";
import { GlassPanel } from "@/app/_components/glass-panel";
import { requireCompanyPageAccess } from "@/lib/auth/server";
import { resolveActiveCompanyId } from "@/src/features/billing/active-company";
import { listCompanies } from "@/src/features/billing/store";
import { listPayrollRows } from "@/src/features/billing/payroll-store";
import SalaryTable from "./_components/salary-table";

export const dynamic = "force-dynamic";

export default async function SalaryPage({ searchParams }: { searchParams: Promise<{ companyId?: string | string[]; payrollMonth?: string | string[] }> }) {
  const params = await searchParams;
  const companies = await listCompanies();
  const allowedCompanyIds = companies.map((company) => company.id);
  const requestedCompanyId = Array.isArray(params.companyId) ? params.companyId[0] : params.companyId;
  const companyId = resolveActiveCompanyId({ requestedCompanyId, allowedCompanyIds });
  if (companyId) await requireCompanyPageAccess("salary", companyId);
  const payrollMonth = (Array.isArray(params.payrollMonth) ? params.payrollMonth[0] : params.payrollMonth) ?? new Date().toISOString().slice(0, 7);
  const rows = companyId ? await listPayrollRows({ companyId, payrollMonth }) : [];

  return (
    <Shell title="Salary" eyebrow="Review and verify monthly employee payroll">
      <GlassPanel gradient>
        <form action="/salary" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="companyId" value={companyId} />
          <label className="block text-sm" style={{ color: "var(--text-secondary)" }}>
            Payroll Month
            <input name="payrollMonth" type="month" defaultValue={payrollMonth} className="mt-2 w-full min-w-0 rounded-2xl border px-4 py-3 text-sm leading-5" />
          </label>
          <button className="btn-outline" type="submit">Apply</button>
        </form>
      </GlassPanel>
      <SalaryTable companyId={companyId} payrollMonth={payrollMonth} rows={rows} />
    </Shell>
  );
}
```

- [ ] **Step 4: Create Salary table component**

Implement `app/salary/_components/salary-table.tsx` as a client component with:

- summary cards from rows
- search/status/changed filters
- table
- right-side drawer state
- hidden `rowsJson` form payload
- buttons: `Save this month only`, `Update employee master too`, `Save Month`

Use the existing `inputClass`, `GlassPanel`, and `PendingSubmitButton`. When a row value differs from source, render text `Changed from ${formatInr(sourceValue)}`.

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npm test -- src/features/billing/salary-render.test.tsx src/features/billing/payroll.test.ts
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 6: Commit**

```powershell
git add app/salary/page.tsx app/salary/_components/salary-table.tsx src/features/billing/salary-render.test.tsx
git commit -m "feat: add salary review page"
```

## Task 6: Employee Cash Flow Prefill From Salary And Admin Override

**Files:**
- Modify: `app/employee-cash-flow/page.tsx`
- Modify: `app/employee-cash-flow/_components/employee-cash-flow-entry-form.tsx`
- Modify: `src/features/billing/employee-cash-flow-store.ts`
- Modify: `src/features/billing/actions.ts`
- Modify: `src/features/billing/employee-cash-flow-store.test.ts`
- Modify: `src/features/billing/employee-cash-flow-saved-rows-render.test.ts`

- [ ] **Step 1: Write failing store test**

Add test proving cash flow prefers payroll monthly values over employee defaults:

```ts
it("prefills cash-flow salary fields from monthly payroll rows when present", async () => {
  const entry = buildCashFlowEntryFromInvoiceLineAndPayroll({
    paymentMonth: "2026-07",
    invoice: {
      id: "invoice_1",
      invoice_number: "INV-1",
      usd_inr_rate: 85,
    },
    lineItem: {
      id: "line_1",
      employee_id: "emp_1",
      employee_name_snapshot: "Rahul",
      billed_total_usd_cents: 100000,
      days_worked: 31,
    },
    employeeDefaults: {
      id: "emp_1",
      fullName: "Rahul",
      defaultActualPaidInrCents: 6500000,
      defaultPfInrCents: 180000,
      defaultTdsInrCents: 400000,
      defaultPaidUsdInrRate: 85,
    },
    payrollRow: {
      id: "payroll_1",
      actualSalaryInrCents: 7000000,
      pfInrCents: 200000,
      tdsInrCents: 500000,
      sourcePaidUsdInrRate: 85,
      netPayableInrCents: 6300000,
    },
  });

  expect(entry.actualPaidInrCents).toBe(7000000);
  expect(entry.pfInrCents).toBe(200000);
  expect(entry.tdsInrCents).toBe(500000);
  expect(entry.payrollSourceId).toBe("payroll_1");
});
```

Use the existing mock patterns in `src/features/billing/employee-cash-flow-store.test.ts`.

- [ ] **Step 2: Run failing focused test**

Run: `npm test -- src/features/billing/employee-cash-flow-store.test.ts`

Expected: fails because prefill does not read payroll.

- [ ] **Step 3: Modify store prefill**

In `src/features/billing/employee-cash-flow-store.ts`, load monthly payroll rows for the selected `companyId` and `paymentMonth`. When building fallback entries, prefer:

- `actual_salary_inr_cents` over employee `default_actual_paid_inr_cents`
- `pf_inr_cents` over employee `default_pf_inr_cents`
- `tds_inr_cents` over employee `default_tds_inr_cents`
- `source_paid_usd_inr_rate` or current payroll peg-rate column over employee default peg rate

Add source metadata to entries so UI can display "From Salary".

- [ ] **Step 4: Add override note validation**

In `employee-cash-flow-entry-form.tsx`, detect salary field changes from payroll source values. If changed, require an override note before Save. Submit override note per row in `entriesJson`.

In `actions.ts`, when parsed entry has payroll override fields, call `applyPayrollAdminOverride` before or after `replaceInvoicePaymentEmployeeEntries`. Revalidate `/salary`, `/employee-cash-flow`, and `/dashboard`.

- [ ] **Step 5: Remove local company selector and ordinary Load dependency**

In `app/employee-cash-flow/page.tsx`:

- resolve company from global active company URL/company helper
- remove the Company select from the filter panel
- keep Month and Invoice controls
- replace the generic Load button with a compact Apply Filters button for Month and Invoice changes; company changes refresh from the global selector

- [ ] **Step 6: Run regression tests**

Run:

```powershell
npm test -- src/features/billing/employee-cash-flow-store.test.ts src/features/billing/employee-cash-flow-page-state.test.ts src/features/billing/employee-cash-flow-saved-rows-render.test.ts src/features/billing/employee-cash-flow.test.ts
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 7: Commit**

```powershell
git add app/employee-cash-flow/page.tsx app/employee-cash-flow/_components/employee-cash-flow-entry-form.tsx src/features/billing/employee-cash-flow-store.ts src/features/billing/actions.ts src/features/billing/employee-cash-flow-store.test.ts src/features/billing/employee-cash-flow-saved-rows-render.test.ts
git commit -m "feat: prefill cash flow from salary payroll"
```

## Task 7: Migrate Company-Scoped Pages To Active Company

**Files:**
- Modify: `app/employees/page.tsx`
- Modify: `app/employee-statements/page.tsx`
- Modify: `app/expenses/page.tsx`
- Modify: `app/invoices/page.tsx`
- Modify: `src/features/billing/store.ts`
- Modify: `src/features/billing/filter-selection.test.ts`

- [ ] **Step 1: Add company-aware loader helpers**

In `src/features/billing/store.ts`, add wrappers or parameters that require caller-passed allowed company IDs when listing scoped data. Keep existing functions available where global admin views need all data.

- [ ] **Step 2: Refactor Employees page**

Remove the top "Filter company" form and Load button. Use active `companyId` from URL/helper. Keep employee add/edit forms, but default company to active company.

- [ ] **Step 3: Refactor Employee Statements page**

Remove local Company select. Use active company for employees, invoices, statement sections. Keep employee and month range filters.

- [ ] **Step 4: Refactor Expenses page**

Remove local Company select and Load button. Use active company. Keep month/year controls.

- [ ] **Step 5: Refactor Invoices page where scoped**

Use active company where the page displays company-specific invoice lists or creation links. Preserve existing all-company behavior only if the route is explicitly a global admin list.

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```powershell
npm test -- src/features/billing/filter-selection.test.ts src/features/billing/invoice-create.test.ts src/features/billing/employee-statements-load.test.ts
npx tsc --noEmit
```

Expected: pass.

- [ ] **Step 7: Commit**

```powershell
git add app/employees/page.tsx app/employee-statements/page.tsx app/expenses/page.tsx app/invoices/page.tsx src/features/billing/store.ts src/features/billing/filter-selection.test.ts
git commit -m "feat: use active company across finance pages"
```

## Task 8: Full Verification, Build, And Browser QA

**Files:**
- Modify tests only if verification reveals test expectation drift.
- No feature code changes unless fixing verified defects.

- [ ] **Step 1: Run full unit suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`

Expected: no TypeScript errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: no ESLint errors.

- [ ] **Step 4: Run production build**

Run: `npm run build`

Expected: Next.js build succeeds.

- [ ] **Step 5: Start dev server**

Run:

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Expected: local app starts on `http://127.0.0.1:3001`.

- [ ] **Step 6: Browser QA**

Use the in-app browser or gstack to verify:

- `/login` loads
- protected routes redirect when unauthenticated
- sidebar renders on an authenticated session when available
- `/salary` renders shell, month control, and empty/auth states without crashing
- mobile viewport shows drawer navigation
- desktop collapsed/expanded sidebar does not overlap content

- [ ] **Step 7: Final status**

Run:

```powershell
git status --short --branch
git log --oneline -8
```

Expected: branch contains the task commits and working tree is clean except intentionally untracked local logs.
