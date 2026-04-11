create table if not exists employee_salary_payments (
  id text primary key,
  employee_id text not null references employees (id) on delete cascade,
  company_id text not null references companies (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  salary_usd_cents integer not null default 0 check (salary_usd_cents >= 0),
  paid_usd_inr_rate numeric(12,4) not null default 0 check (paid_usd_inr_rate >= 0),
  salary_paid_inr_cents bigint not null default 0 check (salary_paid_inr_cents >= 0),
  paid_status boolean not null default false,
  paid_date date,
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
  monthly_paid_usd_cents integer not null default 0 check (monthly_paid_usd_cents >= 0),
  base_dollar_inward_usd_cents integer not null default 0,
  onboarding_advance_usd_cents integer not null default 0,
  offboarding_deduction_usd_cents integer not null default 0,
  effective_dollar_inward_usd_cents integer not null default 0,
  cashout_usd_inr_rate numeric(12,4) not null check (cashout_usd_inr_rate >= 0),
  paid_usd_inr_rate numeric(12,4) not null default 0 check (paid_usd_inr_rate >= 0),
  cash_in_inr_cents bigint not null default 0,
  pf_inr_cents bigint not null default 0,
  tds_inr_cents bigint not null default 0,
  actual_paid_inr_cents bigint not null default 0,
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
