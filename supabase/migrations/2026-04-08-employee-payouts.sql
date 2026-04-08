create table if not exists employee_payouts (
  id text primary key,
  invoice_id text not null references invoices (id) on delete cascade,
  employee_id text not null references employees (id),
  invoice_line_item_id text not null references invoice_line_items (id),
  employee_name_snapshot text not null,
  dollar_inward_usd_cents integer not null,
  employee_monthly_usd_cents integer not null,
  cashout_usd_inr_rate numeric(12,4) not null check (cashout_usd_inr_rate > 0),
  paid_usd_inr_rate numeric(12,4) check (paid_usd_inr_rate is null or paid_usd_inr_rate > 0),
  fx_commission_inr_cents bigint,
  total_commission_usd_cents integer not null,
  commission_earned_inr_cents bigint,
  is_paid boolean not null default false,
  paid_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists employee_payouts_invoice_employee_unique
  on employee_payouts (invoice_id, employee_id);
