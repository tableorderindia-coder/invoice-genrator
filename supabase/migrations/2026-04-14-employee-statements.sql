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
