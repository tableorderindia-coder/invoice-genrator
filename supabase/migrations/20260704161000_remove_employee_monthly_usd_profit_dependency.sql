-- Peg-rate margin migration.
-- Archives monthly-USD dependency columns before removing them from
-- employee/dashboard profit tables. The employee statement table intentionally
-- keeps monthly_dollar_paid_usd_cents as an editable statement-only value.

create table if not exists public.migration_audit_employee_monthly_usd_20260704 (
  exported_at timestamptz not null,
  employee_id text,
  company_id text,
  full_name text,
  payout_monthly_usd_cents integer
);

create table if not exists public.migration_audit_employee_payout_monthly_usd_20260704 (
  exported_at timestamptz not null,
  employee_payout_id text,
  invoice_id text,
  company_id text,
  employee_id text,
  employee_name_snapshot text,
  dollar_inward_usd_cents integer,
  employee_monthly_usd_cents integer
);

create table if not exists public.migration_audit_cashflow_monthly_usd_20260704 (
  exported_at timestamptz not null,
  invoice_payment_employee_entry_id text,
  invoice_payment_id text,
  invoice_id text,
  company_id text,
  employee_id text,
  payment_month text,
  monthly_paid_usd_cents integer
);

create table if not exists public.migration_audit_salary_usd_20260704 (
  exported_at timestamptz not null,
  employee_salary_payment_id text,
  employee_id text,
  company_id text,
  month text,
  salary_usd_cents integer
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employees'
      and column_name = 'payout_monthly_usd_cents'
  ) then
    execute $audit$
      insert into public.migration_audit_employee_monthly_usd_20260704
      select now(), id, company_id, full_name, payout_monthly_usd_cents
      from public.employees
    $audit$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employee_payouts'
      and column_name = 'employee_monthly_usd_cents'
  ) then
    execute $audit$
      insert into public.migration_audit_employee_payout_monthly_usd_20260704
      select
        now(),
        id,
        invoice_id,
        company_id,
        employee_id,
        employee_name_snapshot,
        dollar_inward_usd_cents,
        employee_monthly_usd_cents
      from public.employee_payouts
    $audit$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoice_payment_employee_entries'
      and column_name = 'monthly_paid_usd_cents'
  ) then
    execute $audit$
      insert into public.migration_audit_cashflow_monthly_usd_20260704
      select
        now(),
        id,
        invoice_payment_id,
        invoice_id,
        company_id,
        employee_id,
        payment_month,
        monthly_paid_usd_cents
      from public.invoice_payment_employee_entries
    $audit$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'employee_salary_payments'
      and column_name = 'salary_usd_cents'
  ) then
    execute $audit$
      insert into public.migration_audit_salary_usd_20260704
      select now(), id, employee_id, company_id, month, salary_usd_cents
      from public.employee_salary_payments
    $audit$;
  end if;
end $$;

alter table if exists public.invoice_line_items
  alter column payout_monthly_usd_cents_snapshot set default 0,
  alter column payout_total_usd_cents set default 0,
  alter column profit_total_usd_cents set default 0;

update public.invoice_line_items
set
  payout_monthly_usd_cents_snapshot = coalesce(payout_monthly_usd_cents_snapshot, 0),
  payout_total_usd_cents = coalesce(payout_total_usd_cents, 0),
  profit_total_usd_cents = coalesce(profit_total_usd_cents, billed_total_usd_cents)
where payout_monthly_usd_cents_snapshot is null
   or payout_total_usd_cents is null
   or profit_total_usd_cents is null;

alter table if exists public.employees
  drop column if exists payout_monthly_usd_cents;

alter table if exists public.employee_payouts
  drop column if exists employee_monthly_usd_cents;

alter table if exists public.invoice_payment_employee_entries
  drop column if exists monthly_paid_usd_cents;

alter table if exists public.employee_salary_payments
  drop column if exists salary_usd_cents;
