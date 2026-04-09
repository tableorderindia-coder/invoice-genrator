alter table if exists invoices
  add column if not exists billing_duration text;

update invoices
set billing_duration =
  to_char(make_date(year, month, 1), 'MM/DD/YYYY')
  || ' - '
  || to_char((make_date(year, month, 1) + interval '1 month - 1 day')::date, 'MM/DD/YYYY')
where coalesce(btrim(billing_duration), '') = '';
