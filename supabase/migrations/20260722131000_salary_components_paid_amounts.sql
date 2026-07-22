alter table public.employees
  add column if not exists default_basic_inr_cents bigint not null default 0 check (default_basic_inr_cents >= 0),
  add column if not exists default_special_allowance_inr_cents bigint not null default 0 check (default_special_allowance_inr_cents >= 0),
  add column if not exists default_insurance_inr_cents bigint not null default 0 check (default_insurance_inr_cents >= 0),
  add column if not exists default_bonus_inr_cents bigint not null default 0 check (default_bonus_inr_cents >= 0);

update public.employees
set default_basic_inr_cents = greatest(
  coalesce(default_actual_paid_inr_cents, 0)
    - coalesce(default_pf_inr_cents, 0)
    - coalesce(default_tds_inr_cents, 0),
  0
)
where default_basic_inr_cents = 0
  and default_special_allowance_inr_cents = 0
  and default_insurance_inr_cents = 0
  and default_bonus_inr_cents = 0
  and coalesce(default_actual_paid_inr_cents, 0) > 0;

alter table public.employee_salary_payments
  add column if not exists basic_inr_cents bigint not null default 0 check (basic_inr_cents >= 0),
  add column if not exists special_allowance_inr_cents bigint not null default 0 check (special_allowance_inr_cents >= 0),
  add column if not exists insurance_inr_cents bigint not null default 0 check (insurance_inr_cents >= 0),
  add column if not exists bonus_inr_cents bigint not null default 0 check (bonus_inr_cents >= 0),
  add column if not exists actual_paid_inr_cents bigint not null default 0 check (actual_paid_inr_cents >= 0);

with legacy_rows as (
  select
    id,
    case
      when coalesce(monthly_paid_inr_cents, 0) > 0 then coalesce(monthly_paid_inr_cents, 0)
      else coalesce(salary_paid_inr_cents, 0)
    end as legacy_gross_inr_cents
  from public.employee_salary_payments
)
update public.employee_salary_payments payment
set basic_inr_cents = greatest(
  legacy_rows.legacy_gross_inr_cents
    - coalesce(payment.pf_inr_cents, 0)
    - coalesce(payment.tds_inr_cents, 0),
  0
)
from legacy_rows
where payment.id = legacy_rows.id
  and payment.basic_inr_cents = 0
  and payment.special_allowance_inr_cents = 0
  and payment.insurance_inr_cents = 0
  and payment.bonus_inr_cents = 0
  and legacy_rows.legacy_gross_inr_cents > 0;

with legacy_rows as (
  select
    id,
    case
      when coalesce(monthly_paid_inr_cents, 0) > 0 then coalesce(monthly_paid_inr_cents, 0)
      else coalesce(salary_paid_inr_cents, 0)
    end as legacy_gross_inr_cents
  from public.employee_salary_payments
)
update public.employee_salary_payments payment
set monthly_paid_inr_cents = legacy_rows.legacy_gross_inr_cents
from legacy_rows
where payment.id = legacy_rows.id
  and coalesce(payment.monthly_paid_inr_cents, 0) = 0
  and legacy_rows.legacy_gross_inr_cents > 0;

with legacy_rows as (
  select
    id,
    case
      when coalesce(actual_paid_inr_cents, 0) > 0 then coalesce(actual_paid_inr_cents, 0)
      when coalesce(salary_paid_inr_cents, 0) > 0 then coalesce(salary_paid_inr_cents, 0)
      else coalesce(monthly_paid_inr_cents, 0)
    end as legacy_actual_inr_cents
  from public.employee_salary_payments
)
update public.employee_salary_payments payment
set actual_paid_inr_cents = legacy_rows.legacy_actual_inr_cents
from legacy_rows
where payment.id = legacy_rows.id
  and coalesce(payment.actual_paid_inr_cents, 0) = 0
  and legacy_rows.legacy_actual_inr_cents > 0;

update public.employee_salary_payments
set salary_paid_inr_cents = greatest(
  coalesce(actual_paid_inr_cents, 0)
    - coalesce(pf_inr_cents, 0)
    - coalesce(tds_inr_cents, 0),
  0
)
where coalesce(actual_paid_inr_cents, 0) > 0;

update public.employee_salary_payments
set days_in_month = extract(
  day from (
    date_trunc('month', (month || '-01')::date)
      + interval '1 month'
      - interval '1 day'
  )
)::integer
where coalesce(days_in_month, 0) <= 0
  and month ~ '^\d{4}-\d{2}$';

update public.employee_salary_payments
set days_worked = days_in_month
where coalesce(days_worked, 0) <= 0
  and coalesce(days_in_month, 0) > 0;

alter table public.invoice_payment_employee_entries
  add column if not exists monthly_paid_inr_cents bigint not null default 0 check (monthly_paid_inr_cents >= 0),
  add column if not exists salary_paid_inr_cents bigint not null default 0 check (salary_paid_inr_cents >= 0);

update public.invoice_payment_employee_entries
set monthly_paid_inr_cents = actual_paid_inr_cents
where monthly_paid_inr_cents = 0
  and actual_paid_inr_cents > 0;

update public.invoice_payment_employee_entries
set salary_paid_inr_cents = greatest(
  coalesce(actual_paid_inr_cents, 0)
    - coalesce(pf_inr_cents, 0)
    - coalesce(tds_inr_cents, 0),
  0
)
where salary_paid_inr_cents = 0
  and actual_paid_inr_cents > 0;
