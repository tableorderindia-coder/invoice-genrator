alter table public.employee_salary_payments
  add column if not exists monthly_paid_inr_cents bigint not null default 0 check (monthly_paid_inr_cents >= 0),
  add column if not exists days_worked numeric(8,2) not null default 0 check (days_worked >= 0),
  add column if not exists days_in_month integer not null default 0 check (days_in_month >= 0);

update public.employee_salary_payments
set monthly_paid_inr_cents = salary_paid_inr_cents
where monthly_paid_inr_cents = 0
  and salary_paid_inr_cents > 0;

update public.employee_salary_payments
set days_in_month = extract(day from (
    date_trunc('month', to_date(month || '-01', 'YYYY-MM-DD')) + interval '1 month - 1 day'
  ))::integer
where days_in_month = 0;

update public.employee_salary_payments
set days_worked = days_in_month
where days_worked = 0
  and days_in_month > 0;
