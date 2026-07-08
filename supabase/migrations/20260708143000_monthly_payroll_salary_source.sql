alter table public.employee_salary_payments
  add column if not exists employee_name_snapshot text not null default '',
  add column if not exists pf_inr_cents bigint not null default 0 check (pf_inr_cents >= 0),
  add column if not exists tds_inr_cents bigint not null default 0 check (tds_inr_cents >= 0),
  add column if not exists status text not null default 'draft',
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references public.profiles (id) on delete set null,
  add column if not exists override_note text,
  add column if not exists override_at timestamptz,
  add column if not exists override_by uuid references public.profiles (id) on delete set null;

alter table public.employee_salary_payments
  drop constraint if exists employee_salary_payments_status_check;

alter table public.employee_salary_payments
  add constraint employee_salary_payments_status_check
  check (status in ('draft', 'in_review', 'verified'));

create table if not exists public.employee_salary_payment_audit (
  id text primary key,
  employee_id text not null references public.employees (id) on delete cascade,
  company_id text not null references public.companies (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  actor_user_id uuid references public.profiles (id) on delete set null,
  salary_paid_inr_cents bigint not null default 0 check (salary_paid_inr_cents >= 0),
  pf_inr_cents bigint not null default 0 check (pf_inr_cents >= 0),
  tds_inr_cents bigint not null default 0 check (tds_inr_cents >= 0),
  override_note text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists employee_salary_payment_audit_company_month_idx
  on public.employee_salary_payment_audit (company_id, month);

create index if not exists employee_salary_payment_audit_employee_month_idx
  on public.employee_salary_payment_audit (employee_id, month);

grant select, insert, update, delete on public.employee_salary_payment_audit to authenticated;
revoke all on public.employee_salary_payment_audit from anon;

alter table public.employee_salary_payment_audit enable row level security;

drop policy if exists "employee_salary_payments_all" on public.employee_salary_payments;
create policy "employee_salary_payments_all"
on public.employee_salary_payments
for all
to authenticated
using ((select private.has_any_page_permission(array['salary', 'employee-cash-flow', 'dashboard'], 'view')))
with check ((select private.has_any_page_permission(array['salary', 'employee-cash-flow'], 'edit')));

drop policy if exists "employee_salary_payment_audit_all" on public.employee_salary_payment_audit;
create policy "employee_salary_payment_audit_all"
on public.employee_salary_payment_audit
for all
to authenticated
using ((select private.has_any_page_permission(array['salary', 'employee-cash-flow', 'dashboard'], 'view')))
with check ((select private.has_any_page_permission(array['salary', 'employee-cash-flow'], 'edit')));

drop policy if exists "companies_select" on public.companies;
create policy "companies_select"
on public.companies
for select
to authenticated
using ((
  select private.has_any_page_permission(
    array[
      'overview',
      'companies',
      'invoices',
      'cashout',
      'employee-cash-flow',
      'employee-statements',
      'salary',
      'expenses',
      'dashboard'
    ],
    'view'
  )
));

drop policy if exists "employees_select" on public.employees;
create policy "employees_select"
on public.employees
for select
to authenticated
using ((
  select private.has_any_page_permission(
    array['employees', 'invoices', 'employee-cash-flow', 'employee-statements', 'salary', 'dashboard'],
    'view'
  )
));
