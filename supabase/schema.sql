create table if not exists companies (
  id text primary key,
  name text not null,
  billing_address text not null,
  default_note text not null,
  created_at timestamptz not null default now()
);

create table if not exists employees (
  id text primary key,
  company_id text not null references companies (id) on delete cascade,
  full_name text not null,
  designation text not null,
  default_team text not null,
  billing_rate_usd_cents integer not null,
  payout_monthly_usd_cents integer not null,
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
  due_date date not null,
  status text not null check (status in ('draft', 'generated', 'sent', 'cashed_out')),
  note_text text not null,
  subtotal_usd_cents integer not null default 0,
  adjustments_usd_cents integer not null default 0,
  grand_total_usd_cents integer not null default 0,
  source_invoice_id text references invoices (id),
  pdf_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoice_teams (
  id text primary key,
  invoice_id text not null references invoices (id) on delete cascade,
  team_name text not null,
  sort_order integer not null default 1
);

create table if not exists invoice_line_items (
  id text primary key,
  invoice_team_id text not null references invoice_teams (id) on delete cascade,
  employee_id text not null references employees (id),
  employee_name_snapshot text not null,
  designation_snapshot text not null,
  team_name_snapshot text not null,
  billing_rate_usd_cents integer not null,
  payout_monthly_usd_cents_snapshot integer not null,
  hrs_per_week numeric(8,2) not null,
  billed_total_usd_cents integer not null,
  payout_total_usd_cents integer not null,
  profit_total_usd_cents integer not null
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
  realized_revenue_usd_cents integer not null,
  realized_payout_usd_cents integer not null,
  realized_profit_usd_cents integer not null,
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
  employee_monthly_usd_cents integer not null,
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

create table if not exists dashboard_expenses (
  id text primary key,
  company_id text not null references companies (id) on delete cascade,
  period_type text not null check (period_type in ('monthly', 'yearly')),
  year integer not null,
  month integer check (month is null or month between 1 and 12),
  amount_inr_cents bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create unique index if not exists dashboard_expenses_company_period_unique
  on dashboard_expenses (company_id, period_type, year, coalesce(month, 0));

create index if not exists security_deposit_ledger_company_employee_idx
  on security_deposit_ledger (company_id, employee_id, created_at desc);

create unique index if not exists security_deposit_ledger_adjustment_unique
  on security_deposit_ledger (adjustment_id)
  where adjustment_id is not null;
