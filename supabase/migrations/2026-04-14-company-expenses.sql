-- Company-level expenses: multiple labeled rows per month per company
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
