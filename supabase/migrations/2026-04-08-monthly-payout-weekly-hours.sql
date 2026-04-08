alter table employees
  add column if not exists payout_monthly_usd_cents integer,
  add column if not exists hrs_per_week numeric(8,2);

alter table employees
  alter column payout_monthly_usd_cents set not null,
  alter column hrs_per_week set not null;

alter table employees
  drop column if exists payout_rate_usd_cents;

alter table invoice_line_items
  add column if not exists payout_monthly_usd_cents_snapshot integer,
  add column if not exists hrs_per_week numeric(8,2);

alter table invoice_line_items
  alter column payout_monthly_usd_cents_snapshot set not null,
  alter column hrs_per_week set not null;

alter table invoice_line_items
  drop column if exists payout_rate_usd_cents,
  drop column if exists hours_billed;

alter table invoice_adjustments
  add column if not exists hrs_per_week numeric(8,2);

alter table invoice_adjustments
  drop column if exists hours;
