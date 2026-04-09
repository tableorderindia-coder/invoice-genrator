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

create index if not exists security_deposit_ledger_company_employee_idx
  on security_deposit_ledger (company_id, employee_id, created_at desc);

create unique index if not exists security_deposit_ledger_adjustment_unique
  on security_deposit_ledger (adjustment_id)
  where adjustment_id is not null;
