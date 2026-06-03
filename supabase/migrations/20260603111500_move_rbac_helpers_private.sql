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

revoke execute on function public.current_app_role() from anon, authenticated, public;
revoke execute on function public.is_admin() from anon, authenticated, public;
revoke execute on function public.has_page_permission(text, text) from anon, authenticated, public;
revoke execute on function public.has_any_page_permission(text[], text) from anon, authenticated, public;
revoke execute on function public.guard_profile_self_update() from anon, authenticated, public;

grant execute on function private.current_app_role() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.has_page_permission(text, text) to authenticated;
grant execute on function private.has_any_page_permission(text[], text) to authenticated;
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
    array['employees', 'invoices', 'employee-cash-flow', 'employee-statements', 'dashboard'],
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

drop policy if exists "dashboard_expenses_all" on public.dashboard_expenses;
create policy "dashboard_expenses_all"
on public.dashboard_expenses
for all
to authenticated
using ((select private.has_page_permission('dashboard', 'view')))
with check ((select private.has_page_permission('dashboard', 'edit')));

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
using ((select private.has_any_page_permission(array['employee-cash-flow', 'dashboard'], 'view')))
with check ((select private.has_page_permission('employee-cash-flow', 'edit')));

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
