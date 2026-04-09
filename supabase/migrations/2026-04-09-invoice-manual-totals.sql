alter table if exists invoice_line_items
  add column if not exists manual_total_usd_cents integer;

alter table if exists invoice_teams
  add column if not exists manual_total_usd_cents integer;

alter table if exists invoices
  add column if not exists manual_grand_total_usd_cents integer;
