alter table invoice_realizations
  add column if not exists dollar_inbound_usd_cents integer,
  add column if not exists usd_inr_rate numeric(12,4);

alter table invoice_realizations
  drop constraint if exists invoice_realizations_usd_inr_rate_positive;

update invoice_realizations
set dollar_inbound_usd_cents = realized_revenue_usd_cents
where dollar_inbound_usd_cents is null;

alter table invoice_realizations
  alter column dollar_inbound_usd_cents set not null;

alter table invoice_realizations
  add constraint invoice_realizations_usd_inr_rate_positive
  check (usd_inr_rate is null or usd_inr_rate > 0);
