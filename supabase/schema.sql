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
  payout_rate_usd_cents integer not null,
  active_from date not null,
  active_to date,
  is_active boolean not null default true,
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
  payout_rate_usd_cents integer not null,
  hours_billed numeric(8,2) not null,
  billed_total_usd_cents integer not null,
  payout_total_usd_cents integer not null,
  profit_total_usd_cents integer not null
);

create table if not exists invoice_adjustments (
  id text primary key,
  invoice_id text not null references invoices (id) on delete cascade,
  type text not null check (type in ('onboarding', 'offboarding', 'reimbursement')),
  label text not null,
  employee_name text,
  amount_usd_cents integer not null,
  sort_order integer not null default 1
);

create table if not exists invoice_realizations (
  id text primary key,
  invoice_id text not null unique references invoices (id) on delete cascade,
  realized_at date not null,
  realized_revenue_usd_cents integer not null,
  realized_payout_usd_cents integer not null,
  realized_profit_usd_cents integer not null,
  notes text,
  created_at timestamptz not null default now()
);
