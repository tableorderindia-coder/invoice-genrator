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

create unique index if not exists employee_payouts_invoice_employee_unique
  on employee_payouts (invoice_id, employee_id);

alter table employee_payouts
  add column if not exists company_id text references companies (id) on delete cascade,
  add column if not exists pf_inr_cents bigint not null default 0,
  add column if not exists tds_inr_cents bigint not null default 0,
  add column if not exists actual_paid_inr_cents bigint not null default 0,
  add column if not exists is_non_invoice_employee boolean not null default false;

update employee_payouts ep
set company_id = i.company_id
from invoices i
where ep.invoice_id = i.id
  and ep.company_id is null;

alter table employee_payouts
  alter column company_id set not null,
  alter column invoice_line_item_id drop not null;

alter table employee_payouts
  drop constraint if exists employee_payouts_cashout_usd_inr_rate_check;

alter table employee_payouts
  add constraint employee_payouts_cashout_usd_inr_rate_check
  check (cashout_usd_inr_rate >= 0);
