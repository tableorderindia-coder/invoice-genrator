create table if not exists companies (
  id text primary key,
  name text not null,
  billing_address text not null,
  default_note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role text not null check (role in ('admin', 'user')) default 'user',
  must_change_password boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.permissions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  page text not null check (
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
  ),
  can_view boolean not null default false,
  can_edit boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, page)
);

create table if not exists public.user_company_access (
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id text not null references public.companies (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, company_id)
);

create table if not exists employees (
  id text primary key,
  company_id text not null references companies (id) on delete cascade,
  full_name text not null,
  pan_number text,
  pf_uan text,
  phone_number text,
  designation text not null,
  default_team text not null,
  billing_rate_usd_cents integer not null,
  default_paid_usd_inr_rate numeric(12,4) not null default 0 check (default_paid_usd_inr_rate >= 0),
  default_actual_paid_inr_cents bigint not null default 0,
  default_basic_inr_cents bigint not null default 0 check (default_basic_inr_cents >= 0),
  default_special_allowance_inr_cents bigint not null default 0 check (default_special_allowance_inr_cents >= 0),
  default_insurance_inr_cents bigint not null default 0 check (default_insurance_inr_cents >= 0),
  default_bonus_inr_cents bigint not null default 0 check (default_bonus_inr_cents >= 0),
  default_pf_inr_cents bigint not null default 0,
  default_tds_inr_cents bigint not null default 0,
  hrs_per_week numeric(8,2) not null,
  active_from date not null,
  active_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id text primary key,
  company_id text not null references companies (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id text primary key,
  company_id text not null references companies (id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null,
  invoice_number text not null,
  billing_date date not null,
  billing_duration text,
  due_date date not null,
  status text not null check (status in ('draft', 'generated', 'sent', 'received', 'cashed_out')),
  note_text text not null,
  subtotal_usd_cents integer not null default 0,
  adjustments_usd_cents integer not null default 0,
  grand_total_usd_cents integer not null default 0,
  manual_grand_total_usd_cents integer,
  source_invoice_id text references invoices (id),
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoice_teams (
  id text primary key,
  invoice_id text not null references invoices (id) on delete cascade,
  team_name text not null,
  sort_order integer not null default 1,
  manual_total_usd_cents integer
);

create table if not exists invoice_line_items (
  id text primary key,
  invoice_team_id text not null references invoice_teams (id) on delete cascade,
  employee_id text not null references employees (id),
  employee_name_snapshot text not null,
  designation_snapshot text not null,
  team_name_snapshot text not null,
  billing_rate_usd_cents integer not null,
  hrs_per_week numeric(8,2) not null,
  days_worked integer not null default 0 check (days_worked >= 0),
  billed_total_usd_cents integer not null,
  manual_total_usd_cents integer
);

create table if not exists invoice_adjustments (
  id text primary key,
  invoice_id text not null references invoices (id) on delete cascade,
  type text not null check (type in ('onboarding', 'offboarding', 'reimbursement', 'appraisal')),
  label text not null,
  employee_name text,
  rate_usd_cents integer,
  hrs_per_week numeric(8,2),
  days_worked integer,
  amount_usd_cents integer not null,
  sort_order integer not null default 1
);

create table if not exists invoice_realizations (
  id text primary key,
  invoice_id text not null unique references invoices (id) on delete cascade,
  realized_at date not null,
  dollar_inbound_usd_cents integer not null,
  usd_inr_rate numeric(12,4) check (usd_inr_rate is null or usd_inr_rate > 0),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists employee_payouts (
  id text primary key,
  invoice_id text not null references invoices (id) on delete cascade,
  company_id text not null references companies (id) on delete cascade,
  employee_id text not null references employees (id),
  invoice_line_item_id text references invoice_line_items (id),
  employee_name_snapshot text not null,
  dollar_inward_usd_cents integer not null,
  cashout_usd_inr_rate numeric(12,4) not null check (cashout_usd_inr_rate >= 0),
  paid_usd_inr_rate numeric(12,4) check (paid_usd_inr_rate is null or paid_usd_inr_rate > 0),
  pf_inr_cents bigint not null default 0,
  tds_inr_cents bigint not null default 0,
  actual_paid_inr_cents bigint not null default 0,
  fx_commission_inr_cents bigint,
  total_commission_usd_cents integer not null,
  commission_earned_inr_cents bigint,
  is_non_invoice_employee boolean not null default false,
  is_paid boolean not null default false,
  paid_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoice_payments (
  id text primary key,
  invoice_id text not null references invoices (id) on delete cascade,
  company_id text not null references companies (id) on delete cascade,
  payment_date date not null,
  payment_month text not null check (payment_month ~ '^\d{4}-\d{2}$'),
  usd_inr_rate numeric(12,4) not null check (usd_inr_rate >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_payments_invoice_idx
  on invoice_payments (invoice_id);

create index if not exists invoice_payments_company_month_idx
  on invoice_payments (company_id, payment_month);

create index if not exists invoice_payments_company_payment_date_idx
  on invoice_payments (company_id, payment_date);

create table if not exists invoice_payment_employee_entries (
  id text primary key,
  invoice_payment_id text not null references invoice_payments (id) on delete cascade,
  invoice_id text not null references invoices (id) on delete cascade,
  employee_id text not null references employees (id) on delete cascade,
  company_id text not null references companies (id) on delete cascade,
  payment_month text not null check (payment_month ~ '^\d{4}-\d{2}$'),
  invoice_line_item_id text references invoice_line_items (id) on delete set null,
  employee_name_snapshot text not null,
  days_worked integer not null default 0 check (days_worked >= 0),
  days_in_month integer not null default 0 check (days_in_month >= 0),
  base_dollar_inward_usd_cents integer not null default 0,
  onboarding_advance_usd_cents integer not null default 0,
  reimbursement_usd_cents integer not null default 0 check (reimbursement_usd_cents >= 0),
  reimbursement_labels_text text,
  appraisal_advance_usd_cents integer not null default 0 check (appraisal_advance_usd_cents >= 0),
  offboarding_deduction_usd_cents integer not null default 0,
  effective_dollar_inward_usd_cents integer not null default 0,
  cashout_usd_inr_rate numeric(12,4) not null check (cashout_usd_inr_rate >= 0),
  paid_usd_inr_rate numeric(12,4) not null default 0 check (paid_usd_inr_rate >= 0),
  monthly_paid_inr_cents bigint not null default 0 check (monthly_paid_inr_cents >= 0),
  cash_in_inr_cents bigint not null default 0,
  pf_inr_cents bigint not null default 0,
  tds_inr_cents bigint not null default 0,
  actual_paid_inr_cents bigint not null default 0,
  salary_paid_inr_cents bigint not null default 0 check (salary_paid_inr_cents >= 0),
  fx_commission_inr_cents bigint,
  total_commission_usd_cents integer not null default 0,
  commission_earned_inr_cents bigint,
  gross_earnings_inr_cents bigint,
  is_non_invoice_employee boolean not null default false,
  is_paid boolean not null default false,
  paid_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_payment_employee_entries_payment_idx
  on invoice_payment_employee_entries (invoice_payment_id);

create index if not exists invoice_payment_employee_entries_company_month_idx
  on invoice_payment_employee_entries (company_id, payment_month);

create index if not exists invoice_payment_employee_entries_employee_month_idx
  on invoice_payment_employee_entries (employee_id, payment_month);

create index if not exists invoice_payment_employee_entries_invoice_employee_idx
  on invoice_payment_employee_entries (invoice_id, employee_id);

create table if not exists employee_salary_payments (
  id text primary key,
  employee_id text not null references employees (id) on delete cascade,
  company_id text not null references companies (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  employee_name_snapshot text not null default '',
  paid_usd_inr_rate numeric(12,4) not null default 0 check (paid_usd_inr_rate >= 0),
  basic_inr_cents bigint not null default 0 check (basic_inr_cents >= 0),
  special_allowance_inr_cents bigint not null default 0 check (special_allowance_inr_cents >= 0),
  insurance_inr_cents bigint not null default 0 check (insurance_inr_cents >= 0),
  bonus_inr_cents bigint not null default 0 check (bonus_inr_cents >= 0),
  monthly_paid_inr_cents bigint not null default 0 check (monthly_paid_inr_cents >= 0),
  days_worked numeric(8,2) not null default 0 check (days_worked >= 0),
  days_in_month integer not null default 0 check (days_in_month >= 0),
  actual_paid_inr_cents bigint not null default 0 check (actual_paid_inr_cents >= 0),
  salary_paid_inr_cents bigint not null default 0 check (salary_paid_inr_cents >= 0),
  pf_inr_cents bigint not null default 0 check (pf_inr_cents >= 0),
  tds_inr_cents bigint not null default 0 check (tds_inr_cents >= 0),
  paid_status boolean not null default false,
  paid_date date,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'verified')),
  verified_at timestamptz,
  verified_by uuid references profiles (id) on delete set null,
  override_note text,
  override_at timestamptz,
  override_by uuid references profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists employee_salary_payments_employee_month_unique
  on employee_salary_payments (employee_id, company_id, month);

create index if not exists employee_salary_payments_company_month_idx
  on employee_salary_payments (company_id, month);

create index if not exists employee_salary_payments_employee_month_idx
  on employee_salary_payments (employee_id, month);

create table if not exists employee_salary_payment_audit (
  id text primary key,
  employee_id text not null references employees (id) on delete cascade,
  company_id text not null references companies (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  actor_user_id uuid references profiles (id) on delete set null,
  salary_paid_inr_cents bigint not null default 0 check (salary_paid_inr_cents >= 0),
  pf_inr_cents bigint not null default 0 check (pf_inr_cents >= 0),
  tds_inr_cents bigint not null default 0 check (tds_inr_cents >= 0),
  override_note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists employee_salary_payment_audit_company_month_idx
  on employee_salary_payment_audit (company_id, month);

create index if not exists employee_salary_payment_audit_employee_month_idx
  on employee_salary_payment_audit (employee_id, month);

create table if not exists employee_payslip_templates (
  id text primary key,
  employee_id text not null references employees (id) on delete cascade,
  company_id text not null references companies (id) on delete cascade,
  earnings jsonb not null default '[]'::jsonb,
  deductions jsonb not null default '[]'::jsonb,
  tds_income_tax_deductions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, employee_id)
);

create table if not exists employee_payslips (
  id text primary key,
  employee_id text not null references employees (id) on delete cascade,
  company_id text not null references companies (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  employee_name_snapshot text not null,
  pan_number text,
  pf_uan text,
  joining_date date not null,
  designation_snapshot text not null,
  effective_work_days integer not null default 0 check (effective_work_days >= 0),
  earnings jsonb not null default '[]'::jsonb,
  deductions jsonb not null default '[]'::jsonb,
  tds_earnings jsonb not null default '[]'::jsonb,
  tds_income_tax_deductions jsonb not null default '[]'::jsonb,
  tax_paid_months jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, employee_id, month)
);

create index if not exists employee_payslip_templates_company_employee_idx
  on employee_payslip_templates (company_id, employee_id);

create index if not exists employee_payslips_company_month_idx
  on employee_payslips (company_id, month);

create index if not exists employee_payslips_employee_month_idx
  on employee_payslips (employee_id, month);

create table if not exists company_expenses (
  id text primary key,
  company_id text not null references companies(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  label text not null default '',
  amount_inr_cents bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_expenses_company_period_idx
  on company_expenses (company_id, year, month);

create table if not exists founder_withdrawals (
  id text primary key,
  company_id text references companies(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  founder_key text not null check (
    founder_key in (
      'nirbhay_kumar_giri',
      'pawan_kumar_beesetti',
      'vishal_savaliya'
    )
  ),
  founder_name_snapshot text not null,
  withdrawal_inr_cents bigint not null default 0 check (withdrawal_inr_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists founder_withdrawals_company_period_founder_unique
  on founder_withdrawals (company_id, year, month, founder_key) nulls not distinct;

create index if not exists founder_withdrawals_period_idx
  on founder_withdrawals (year, month);

create table if not exists employee_statement_invoice_rows (
  id text primary key,
  employee_id text not null references employees (id) on delete cascade,
  invoice_id text not null references invoices (id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  employee_name_snapshot text not null,
  invoice_number_snapshot text not null,
  dollar_inward_usd_cents integer not null default 0,
  onboarding_advance_usd_cents integer not null default 0,
  reimbursement_usd_cents integer not null default 0,
  reimbursement_labels_text text not null default '',
  appraisal_advance_usd_cents integer not null default 0 check (appraisal_advance_usd_cents >= 0),
  offboarding_deduction_usd_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists employee_statement_invoice_rows_employee_invoice_unique
  on employee_statement_invoice_rows (employee_id, invoice_id);

create index if not exists employee_statement_invoice_rows_employee_month_idx
  on employee_statement_invoice_rows (employee_id, month_key);

create table if not exists employee_statement_month_summaries (
  id text primary key,
  employee_id text not null references employees (id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  month_label_snapshot text not null,
  effective_dollar_inward_usd_cents integer not null default 0,
  monthly_dollar_paid_usd_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists employee_statement_month_summaries_employee_month_unique
  on employee_statement_month_summaries (employee_id, month_key);

create index if not exists employee_statement_month_summaries_employee_idx
  on employee_statement_month_summaries (employee_id, month_key);

create table if not exists security_deposit_ledger (
  id text primary key,
  company_id text not null references companies (id) on delete cascade,
  employee_id text not null references employees (id) on delete cascade,
  invoice_id text not null references invoices (id) on delete cascade,
  adjustment_id text references invoice_adjustments (id) on delete set null,
  movement_type text not null check (movement_type in ('credit', 'debit')),
  amount_usd_cents integer not null check (amount_usd_cents >= 0),
  created_at timestamptz not null default now()
);

create unique index if not exists companies_name_unique_ci
  on companies (lower(btrim(name)));

create unique index if not exists employees_company_full_name_unique_ci
  on employees (company_id, lower(btrim(full_name)));

create index if not exists employees_company_full_name_idx
  on employees (company_id, full_name);

create unique index if not exists invoices_invoice_number_unique_ci
  on invoices (lower(btrim(invoice_number)));

create unique index if not exists teams_company_name_unique_ci
  on teams (company_id, lower(btrim(name)));

create unique index if not exists invoice_teams_invoice_team_name_unique_ci
  on invoice_teams (invoice_id, lower(btrim(team_name)));

create unique index if not exists invoice_line_items_team_employee_unique
  on invoice_line_items (invoice_team_id, employee_id);

create unique index if not exists employee_payouts_invoice_employee_unique
  on employee_payouts (invoice_id, employee_id);

create index if not exists security_deposit_ledger_company_employee_idx
  on security_deposit_ledger (company_id, employee_id, created_at desc);

create unique index if not exists security_deposit_ledger_adjustment_unique
  on security_deposit_ledger (adjustment_id)
  where adjustment_id is not null;

-- BEGIN CURRENT RBAC SNAPSHOT
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on public.profiles from anon;
revoke all on public.permissions from anon;
revoke all on public.user_company_access from anon;

-- Move RBAC helper logic out of the exposed public API schema.
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = (select auth.uid())),
    'user'
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select private.current_app_role() = 'admin';
$$;

create or replace function private.has_page_permission(
  requested_page text,
  requested_mode text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select
    private.is_admin()
    or exists (
      select 1
      from public.permissions
      where user_id = (select auth.uid())
        and page = requested_page
        and (
          case
            when requested_mode = 'edit' then can_edit
            else can_view
          end
        )
    );
$$;

create or replace function private.has_any_page_permission(
  requested_pages text[],
  requested_mode text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select
    private.is_admin()
    or exists (
      select 1
      from unnest(requested_pages) as requested_page
      where private.has_page_permission(requested_page, requested_mode)
    );
$$;

create or replace function private.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if private.is_admin() then
    return new;
  end if;

  if (select auth.uid()) is null or old.id <> (select auth.uid()) then
    raise exception 'Only admins can update other profiles.';
  end if;

  if new.email is distinct from old.email then
    raise exception 'Users cannot change profile email directly.';
  end if;

  if new.role is distinct from old.role then
    raise exception 'Users cannot change their role.';
  end if;

  if old.must_change_password = false and new.must_change_password = true then
    raise exception 'Users cannot re-enable forced password reset.';
  end if;

  return new;
end;
$$;

grant execute on function private.current_app_role() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.has_page_permission(text, text) to authenticated;
grant execute on function private.has_any_page_permission(text[], text) to authenticated;
grant select, insert, update, delete on public.user_company_access to authenticated;
grant execute on function private.guard_profile_self_update() to authenticated;

drop trigger if exists profiles_guard_profile_self_update on public.profiles;
create trigger profiles_guard_profile_self_update
before update on public.profiles
for each row
execute function private.guard_profile_self_update();

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
on public.profiles
for select
to authenticated
using ((select private.is_admin()) or id = (select auth.uid()));

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert"
on public.profiles
for insert
to authenticated
with check ((select private.is_admin()));

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update"
on public.profiles
for update
to authenticated
using ((select private.is_admin()) or id = (select auth.uid()))
with check ((select private.is_admin()) or id = (select auth.uid()));

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete"
on public.profiles
for delete
to authenticated
using ((select private.is_admin()));

drop policy if exists "permissions_select" on public.permissions;
create policy "permissions_select"
on public.permissions
for select
to authenticated
using ((select private.is_admin()) or user_id = (select auth.uid()));

drop policy if exists "permissions_insert" on public.permissions;
create policy "permissions_insert"
on public.permissions
for insert
to authenticated
with check ((select private.is_admin()));

drop policy if exists "permissions_update" on public.permissions;
create policy "permissions_update"
on public.permissions
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "permissions_delete" on public.permissions;
create policy "permissions_delete"
on public.permissions
for delete
to authenticated
using ((select private.is_admin()));

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

drop policy if exists "companies_modify" on public.companies;
drop policy if exists "companies_insert" on public.companies;
create policy "companies_insert"
on public.companies
for insert
to authenticated
with check ((select private.has_page_permission('companies', 'edit')));
drop policy if exists "companies_update" on public.companies;
create policy "companies_update"
on public.companies
for update
to authenticated
using ((select private.has_page_permission('companies', 'edit')))
with check ((select private.has_page_permission('companies', 'edit')));
drop policy if exists "companies_delete" on public.companies;
create policy "companies_delete"
on public.companies
for delete
to authenticated
using ((select private.has_page_permission('companies', 'edit')));

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

drop policy if exists "employees_modify" on public.employees;
drop policy if exists "employees_insert" on public.employees;
create policy "employees_insert"
on public.employees
for insert
to authenticated
with check ((select private.has_page_permission('employees', 'edit')));
drop policy if exists "employees_update" on public.employees;
create policy "employees_update"
on public.employees
for update
to authenticated
using ((select private.has_page_permission('employees', 'edit')))
with check ((select private.has_page_permission('employees', 'edit')));
drop policy if exists "employees_delete" on public.employees;
create policy "employees_delete"
on public.employees
for delete
to authenticated
using ((select private.has_page_permission('employees', 'edit')));

drop policy if exists "teams_select" on public.teams;
create policy "teams_select"
on public.teams
for select
to authenticated
using ((select private.has_page_permission('invoices', 'view')));

drop policy if exists "teams_modify" on public.teams;
drop policy if exists "teams_insert" on public.teams;
create policy "teams_insert"
on public.teams
for insert
to authenticated
with check ((select private.has_page_permission('invoices', 'edit')));
drop policy if exists "teams_update" on public.teams;
create policy "teams_update"
on public.teams
for update
to authenticated
using ((select private.has_page_permission('invoices', 'edit')))
with check ((select private.has_page_permission('invoices', 'edit')));
drop policy if exists "teams_delete" on public.teams;
create policy "teams_delete"
on public.teams
for delete
to authenticated
using ((select private.has_page_permission('invoices', 'edit')));

drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select"
on public.invoices
for select
to authenticated
using ((
  select private.has_any_page_permission(
    array['overview', 'invoices', 'cashout', 'dashboard', 'employee-statements', 'employee-cash-flow'],
    'view'
  )
));

drop policy if exists "invoices_modify" on public.invoices;
drop policy if exists "invoices_insert" on public.invoices;
create policy "invoices_insert"
on public.invoices
for insert
to authenticated
with check ((select private.has_any_page_permission(array['invoices', 'cashout'], 'edit')));
drop policy if exists "invoices_update" on public.invoices;
create policy "invoices_update"
on public.invoices
for update
to authenticated
using ((select private.has_any_page_permission(array['invoices', 'cashout'], 'edit')))
with check ((select private.has_any_page_permission(array['invoices', 'cashout'], 'edit')));
drop policy if exists "invoices_delete" on public.invoices;
create policy "invoices_delete"
on public.invoices
for delete
to authenticated
using ((select private.has_any_page_permission(array['invoices', 'cashout'], 'edit')));

drop policy if exists "invoice_teams_all" on public.invoice_teams;
create policy "invoice_teams_all"
on public.invoice_teams
for all
to authenticated
using ((select private.has_page_permission('invoices', 'view')))
with check ((select private.has_page_permission('invoices', 'edit')));

drop policy if exists "invoice_line_items_all" on public.invoice_line_items;
create policy "invoice_line_items_all"
on public.invoice_line_items
for all
to authenticated
using ((select private.has_page_permission('invoices', 'view')))
with check ((select private.has_page_permission('invoices', 'edit')));

drop policy if exists "invoice_adjustments_all" on public.invoice_adjustments;
create policy "invoice_adjustments_all"
on public.invoice_adjustments
for all
to authenticated
using ((select private.has_page_permission('invoices', 'view')))
with check ((select private.has_page_permission('invoices', 'edit')));

drop policy if exists "invoice_realizations_all" on public.invoice_realizations;
create policy "invoice_realizations_all"
on public.invoice_realizations
for all
to authenticated
using ((select private.has_any_page_permission(array['invoices', 'cashout', 'dashboard'], 'view')))
with check ((select private.has_any_page_permission(array['invoices', 'cashout'], 'edit')));

drop policy if exists "company_expenses_all" on public.company_expenses;
create policy "company_expenses_all"
on public.company_expenses
for all
to authenticated
using ((select private.has_any_page_permission(array['expenses', 'dashboard'], 'view')))
with check ((select private.has_page_permission('expenses', 'edit')));

drop policy if exists "invoice_payments_all" on public.invoice_payments;
create policy "invoice_payments_all"
on public.invoice_payments
for all
to authenticated
using ((select private.has_any_page_permission(array['employee-cash-flow', 'dashboard'], 'view')))
with check ((select private.has_page_permission('employee-cash-flow', 'edit')));

drop policy if exists "invoice_payment_employee_entries_all" on public.invoice_payment_employee_entries;
create policy "invoice_payment_employee_entries_all"
on public.invoice_payment_employee_entries
for all
to authenticated
using ((
  select private.has_any_page_permission(
    array['employee-cash-flow', 'dashboard', 'employee-statements'],
    'view'
  )
))
with check ((select private.has_page_permission('employee-cash-flow', 'edit')));

drop policy if exists "employee_salary_payments_all" on public.employee_salary_payments;
create policy "employee_salary_payments_all"
on public.employee_salary_payments
for all
to authenticated
using ((select private.has_any_page_permission(array['salary', 'employee-cash-flow', 'dashboard'], 'view')))
with check ((select private.has_any_page_permission(array['salary', 'employee-cash-flow'], 'edit')));

alter table public.employee_salary_payment_audit enable row level security;
drop policy if exists "employee_salary_payment_audit_all" on public.employee_salary_payment_audit;
create policy "employee_salary_payment_audit_all"
on public.employee_salary_payment_audit
for all
to authenticated
using ((select private.has_any_page_permission(array['salary', 'employee-cash-flow', 'dashboard'], 'view')))
with check ((select private.has_any_page_permission(array['salary', 'employee-cash-flow'], 'edit')));

alter table public.employee_payslip_templates enable row level security;
drop policy if exists "employee_payslip_templates_all" on public.employee_payslip_templates;
create policy "employee_payslip_templates_all"
on public.employee_payslip_templates
for all
to authenticated
using ((select private.has_page_permission('salary', 'view')))
with check ((select private.has_page_permission('salary', 'edit')));

alter table public.employee_payslips enable row level security;
drop policy if exists "employee_payslips_all" on public.employee_payslips;
create policy "employee_payslips_all"
on public.employee_payslips
for all
to authenticated
using ((select private.has_page_permission('salary', 'view')))
with check ((select private.has_page_permission('salary', 'edit')));

drop policy if exists "employee_payouts_all" on public.employee_payouts;
create policy "employee_payouts_all"
on public.employee_payouts
for all
to authenticated
using ((select private.has_any_page_permission(array['employee-cash-flow', 'dashboard'], 'view')))
with check ((select private.has_page_permission('employee-cash-flow', 'edit')));

drop policy if exists "security_deposit_ledger_all" on public.security_deposit_ledger;
create policy "security_deposit_ledger_all"
on public.security_deposit_ledger
for all
to authenticated
using ((select private.has_any_page_permission(array['invoices', 'employee-cash-flow'], 'view')))
with check ((select private.has_any_page_permission(array['invoices', 'employee-cash-flow'], 'edit')));

drop policy if exists "employee_statement_invoice_rows_all" on public.employee_statement_invoice_rows;
create policy "employee_statement_invoice_rows_all"
on public.employee_statement_invoice_rows
for all
to authenticated
using ((select private.has_page_permission('employee-statements', 'view')))
with check ((select private.has_page_permission('employee-statements', 'edit')));

drop policy if exists "employee_statement_month_summaries_all" on public.employee_statement_month_summaries;
create policy "employee_statement_month_summaries_all"
on public.employee_statement_month_summaries
for all
to authenticated
using ((select private.has_page_permission('employee-statements', 'view')))
with check ((select private.has_page_permission('employee-statements', 'edit')));

drop policy if exists "founder_withdrawals_select" on public.founder_withdrawals;
create policy "founder_withdrawals_select"
on public.founder_withdrawals
for select
to authenticated
using ((select private.has_any_page_permission(array['dashboard'], 'view')));

drop policy if exists "founder_withdrawals_insert" on public.founder_withdrawals;
create policy "founder_withdrawals_insert"
on public.founder_withdrawals
for insert
to authenticated
with check ((select private.has_page_permission('dashboard', 'edit')));

drop policy if exists "founder_withdrawals_update" on public.founder_withdrawals;
create policy "founder_withdrawals_update"
on public.founder_withdrawals
for update
to authenticated
using ((select private.has_page_permission('dashboard', 'edit')))
with check ((select private.has_page_permission('dashboard', 'edit')));

-- END CURRENT RBAC SNAPSHOT
