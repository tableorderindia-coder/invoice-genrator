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

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'user'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_app_role() = 'admin';
$$;

create or replace function public.has_page_permission(
  requested_page text,
  requested_mode text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.permissions
      where user_id = auth.uid()
        and page = requested_page
        and (
          case
            when requested_mode = 'edit' then can_edit
            else can_view
          end
        )
    );
$$;

create or replace function public.has_any_page_permission(
  requested_pages text[],
  requested_mode text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from unnest(requested_pages) as requested_page
      where public.has_page_permission(requested_page, requested_mode)
    );
$$;

create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if auth.uid() is null or old.id <> auth.uid() then
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

drop trigger if exists profiles_guard_profile_self_update on public.profiles;
create trigger profiles_guard_profile_self_update
before update on public.profiles
for each row
execute function public.guard_profile_self_update();

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.permissions to authenticated;
grant usage, select on sequence public.permissions_id_seq to authenticated;

revoke all on public.profiles from anon;
revoke all on public.permissions from anon;

alter table public.profiles enable row level security;
alter table public.permissions enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
on public.profiles
for select
to authenticated
using (public.is_admin() or id = auth.uid());

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update"
on public.profiles
for update
to authenticated
using (public.is_admin() or id = auth.uid())
with check (public.is_admin() or id = auth.uid());

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete"
on public.profiles
for delete
to authenticated
using (public.is_admin());

drop policy if exists "permissions_select" on public.permissions;
create policy "permissions_select"
on public.permissions
for select
to authenticated
using (public.is_admin() or user_id = auth.uid());

drop policy if exists "permissions_insert" on public.permissions;
create policy "permissions_insert"
on public.permissions
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "permissions_update" on public.permissions;
create policy "permissions_update"
on public.permissions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "permissions_delete" on public.permissions;
create policy "permissions_delete"
on public.permissions
for delete
to authenticated
using (public.is_admin());

grant select, insert, update, delete on
  public.companies,
  public.employees,
  public.teams,
  public.invoices,
  public.invoice_teams,
  public.invoice_line_items,
  public.invoice_adjustments,
  public.invoice_realizations,
  public.dashboard_expenses,
  public.company_expenses,
  public.invoice_payments,
  public.invoice_payment_employee_entries,
  public.employee_salary_payments,
  public.employee_payouts,
  public.security_deposit_ledger,
  public.employee_statement_invoice_rows,
  public.employee_statement_month_summaries
to authenticated;

revoke all on
  public.companies,
  public.employees,
  public.teams,
  public.invoices,
  public.invoice_teams,
  public.invoice_line_items,
  public.invoice_adjustments,
  public.invoice_realizations,
  public.dashboard_expenses,
  public.company_expenses,
  public.invoice_payments,
  public.invoice_payment_employee_entries,
  public.employee_salary_payments,
  public.employee_payouts,
  public.security_deposit_ledger,
  public.employee_statement_invoice_rows,
  public.employee_statement_month_summaries
from anon;

alter table public.companies enable row level security;
alter table public.employees enable row level security;
alter table public.teams enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_teams enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.invoice_adjustments enable row level security;
alter table public.invoice_realizations enable row level security;
alter table public.dashboard_expenses enable row level security;
alter table public.company_expenses enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.invoice_payment_employee_entries enable row level security;
alter table public.employee_salary_payments enable row level security;
alter table public.employee_payouts enable row level security;
alter table public.security_deposit_ledger enable row level security;
alter table public.employee_statement_invoice_rows enable row level security;
alter table public.employee_statement_month_summaries enable row level security;

drop policy if exists "companies_select" on public.companies;
create policy "companies_select"
on public.companies
for select
to authenticated
using (
  public.has_any_page_permission(
    array[
      'overview',
      'companies',
      'invoices',
      'cashout',
      'employee-cash-flow',
      'employee-statements',
      'expenses',
      'dashboard'
    ],
    'view'
  )
);

drop policy if exists "companies_modify" on public.companies;
create policy "companies_modify"
on public.companies
for all
to authenticated
using (public.has_page_permission('companies', 'edit'))
with check (public.has_page_permission('companies', 'edit'));

drop policy if exists "employees_select" on public.employees;
create policy "employees_select"
on public.employees
for select
to authenticated
using (
  public.has_any_page_permission(
    array['employees', 'invoices', 'employee-cash-flow', 'employee-statements', 'dashboard'],
    'view'
  )
);

drop policy if exists "employees_modify" on public.employees;
create policy "employees_modify"
on public.employees
for all
to authenticated
using (public.has_page_permission('employees', 'edit'))
with check (public.has_page_permission('employees', 'edit'));

drop policy if exists "teams_select" on public.teams;
create policy "teams_select"
on public.teams
for select
to authenticated
using (public.has_page_permission('invoices', 'view'));

drop policy if exists "teams_modify" on public.teams;
create policy "teams_modify"
on public.teams
for all
to authenticated
using (public.has_page_permission('invoices', 'edit'))
with check (public.has_page_permission('invoices', 'edit'));

drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select"
on public.invoices
for select
to authenticated
using (
  public.has_any_page_permission(
    array['overview', 'invoices', 'cashout', 'dashboard', 'employee-statements', 'employee-cash-flow'],
    'view'
  )
);

drop policy if exists "invoices_modify" on public.invoices;
create policy "invoices_modify"
on public.invoices
for all
to authenticated
using (public.has_any_page_permission(array['invoices', 'cashout'], 'edit'))
with check (public.has_any_page_permission(array['invoices', 'cashout'], 'edit'));

drop policy if exists "invoice_teams_all" on public.invoice_teams;
create policy "invoice_teams_all"
on public.invoice_teams
for all
to authenticated
using (public.has_page_permission('invoices', 'view'))
with check (public.has_page_permission('invoices', 'edit'));

drop policy if exists "invoice_line_items_all" on public.invoice_line_items;
create policy "invoice_line_items_all"
on public.invoice_line_items
for all
to authenticated
using (public.has_page_permission('invoices', 'view'))
with check (public.has_page_permission('invoices', 'edit'));

drop policy if exists "invoice_adjustments_all" on public.invoice_adjustments;
create policy "invoice_adjustments_all"
on public.invoice_adjustments
for all
to authenticated
using (public.has_page_permission('invoices', 'view'))
with check (public.has_page_permission('invoices', 'edit'));

drop policy if exists "invoice_realizations_all" on public.invoice_realizations;
create policy "invoice_realizations_all"
on public.invoice_realizations
for all
to authenticated
using (public.has_any_page_permission(array['invoices', 'cashout', 'dashboard'], 'view'))
with check (public.has_any_page_permission(array['invoices', 'cashout'], 'edit'));

drop policy if exists "dashboard_expenses_all" on public.dashboard_expenses;
create policy "dashboard_expenses_all"
on public.dashboard_expenses
for all
to authenticated
using (public.has_page_permission('dashboard', 'view'))
with check (public.has_page_permission('dashboard', 'edit'));

drop policy if exists "company_expenses_all" on public.company_expenses;
create policy "company_expenses_all"
on public.company_expenses
for all
to authenticated
using (public.has_any_page_permission(array['expenses', 'dashboard'], 'view'))
with check (public.has_page_permission('expenses', 'edit'));

drop policy if exists "invoice_payments_all" on public.invoice_payments;
create policy "invoice_payments_all"
on public.invoice_payments
for all
to authenticated
using (public.has_any_page_permission(array['employee-cash-flow', 'dashboard'], 'view'))
with check (public.has_page_permission('employee-cash-flow', 'edit'));

drop policy if exists "invoice_payment_employee_entries_all" on public.invoice_payment_employee_entries;
create policy "invoice_payment_employee_entries_all"
on public.invoice_payment_employee_entries
for all
to authenticated
using (
  public.has_any_page_permission(
    array['employee-cash-flow', 'dashboard', 'employee-statements'],
    'view'
  )
)
with check (public.has_page_permission('employee-cash-flow', 'edit'));

drop policy if exists "employee_salary_payments_all" on public.employee_salary_payments;
create policy "employee_salary_payments_all"
on public.employee_salary_payments
for all
to authenticated
using (public.has_any_page_permission(array['employee-cash-flow', 'dashboard'], 'view'))
with check (public.has_page_permission('employee-cash-flow', 'edit'));

drop policy if exists "employee_payouts_all" on public.employee_payouts;
create policy "employee_payouts_all"
on public.employee_payouts
for all
to authenticated
using (public.has_any_page_permission(array['employee-cash-flow', 'dashboard'], 'view'))
with check (public.has_page_permission('employee-cash-flow', 'edit'));

drop policy if exists "security_deposit_ledger_all" on public.security_deposit_ledger;
create policy "security_deposit_ledger_all"
on public.security_deposit_ledger
for all
to authenticated
using (public.has_any_page_permission(array['invoices', 'employee-cash-flow'], 'view'))
with check (public.has_any_page_permission(array['invoices', 'employee-cash-flow'], 'edit'));

drop policy if exists "employee_statement_invoice_rows_all" on public.employee_statement_invoice_rows;
create policy "employee_statement_invoice_rows_all"
on public.employee_statement_invoice_rows
for all
to authenticated
using (public.has_page_permission('employee-statements', 'view'))
with check (public.has_page_permission('employee-statements', 'edit'));

drop policy if exists "employee_statement_month_summaries_all" on public.employee_statement_month_summaries;
create policy "employee_statement_month_summaries_all"
on public.employee_statement_month_summaries
for all
to authenticated
using (public.has_page_permission('employee-statements', 'view'))
with check (public.has_page_permission('employee-statements', 'edit'));
