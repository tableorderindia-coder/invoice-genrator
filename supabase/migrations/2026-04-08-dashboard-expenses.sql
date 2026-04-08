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

create unique index if not exists dashboard_expenses_company_period_unique
  on dashboard_expenses (company_id, period_type, year, coalesce(month, 0));
