-- Neon/plain-Postgres target schema, adapted from supabase/schema.sql.
--
-- Differences from the Supabase version:
--   * No `auth` schema / Supabase Auth. `profiles` now owns its own
--     credentials (password_hash) instead of referencing auth.users.
--   * No Row Level Security / RBAC policies (see the removed
--     "CURRENT RBAC SNAPSHOT" block in supabase/schema.sql). Authorization
--     is enforced entirely in the app layer (lib/auth/*), consistent with
--     how company-level access was already enforced there.
--   * Adds portal_company_snapshots, which app code referenced but which
--     was never actually present in supabase/schema.sql (schema drift).
create extension if not exists pgcrypto;

create table if not exists companies (
  id text primary key,
  name text not null,
  billing_address text not null,
  default_note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'user')) default 'user',
  must_change_password boolean not null default true,
  overview_exclude_onboarding_advance_from_net_pl boolean not null default false,
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


-- Cache table backing src/features/billing/portal-snapshot-cache.ts.
-- Present here (unlike in supabase/schema.sql) so it actually exists on
-- the new database from day one instead of silently no-op'ing.
create table if not exists portal_company_snapshots (
  company_id text not null,
  snapshot_type text not null,
  month_key text not null default '',
  payload_json jsonb not null,
  source_version text,
  rebuilt_at timestamptz not null default now(),
  primary key (company_id, snapshot_type, month_key)
);
