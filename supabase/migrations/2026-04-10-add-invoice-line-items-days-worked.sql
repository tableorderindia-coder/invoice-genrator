alter table public.invoice_line_items
  add column if not exists days_worked integer;

update public.invoice_line_items as li
set days_worked = calc.days_in_month
from (
  select
    it.id as invoice_team_id,
    extract(day from (date_trunc('month', make_date(i.year, i.month, 1)) + interval '1 month - 1 day'))::integer as days_in_month
  from public.invoice_teams it
  join public.invoices i on i.id = it.invoice_id
) as calc
where li.invoice_team_id = calc.invoice_team_id
  and (li.days_worked is null or li.days_worked <= 0);

alter table public.invoice_line_items
  drop constraint if exists invoice_line_items_days_worked_positive_check;

alter table public.invoice_line_items
  add constraint invoice_line_items_days_worked_positive_check
  check (days_worked is not null and days_worked > 0);
