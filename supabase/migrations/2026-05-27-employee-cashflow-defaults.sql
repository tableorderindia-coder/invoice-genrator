alter table employees
  add column if not exists default_paid_usd_inr_rate numeric(12,4) not null default 0,
  add column if not exists default_actual_paid_inr_cents bigint not null default 0,
  add column if not exists default_pf_inr_cents bigint not null default 0,
  add column if not exists default_tds_inr_cents bigint not null default 0;

alter table employees
  add constraint employees_default_paid_usd_inr_rate_nonnegative
  check (default_paid_usd_inr_rate >= 0)
  not valid;

alter table employees
  validate constraint employees_default_paid_usd_inr_rate_nonnegative;
