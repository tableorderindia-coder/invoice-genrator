begin;

create table if not exists public.migration_audit_dashboard_expenses_20260705 (
  source_id text primary key,
  row_data jsonb not null,
  exported_at timestamptz not null default now()
);

create table if not exists public.migration_audit_invoice_line_item_legacy_profit_20260705 (
  source_id text primary key,
  row_data jsonb not null,
  exported_at timestamptz not null default now()
);

create table if not exists public.migration_audit_invoice_realization_legacy_profit_20260705 (
  source_id text primary key,
  row_data jsonb not null,
  exported_at timestamptz not null default now()
);

do $$
begin
  if to_regclass('public.dashboard_expenses') is not null then
    insert into public.migration_audit_dashboard_expenses_20260705 (source_id, row_data)
    select id, to_jsonb(dashboard_expenses)
    from public.dashboard_expenses
    on conflict (source_id) do nothing;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoice_line_items'
      and column_name in (
        'payout_monthly_usd_cents_snapshot',
        'payout_total_usd_cents',
        'profit_total_usd_cents'
      )
  ) then
    insert into public.migration_audit_invoice_line_item_legacy_profit_20260705 (source_id, row_data)
    select id, to_jsonb(invoice_line_items)
    from public.invoice_line_items
    on conflict (source_id) do nothing;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoice_realizations'
      and column_name in (
        'realized_revenue_usd_cents',
        'realized_payout_usd_cents',
        'realized_profit_usd_cents'
      )
  ) then
    insert into public.migration_audit_invoice_realization_legacy_profit_20260705 (source_id, row_data)
    select id, to_jsonb(invoice_realizations)
    from public.invoice_realizations
    on conflict (source_id) do nothing;
  end if;
end $$;

drop policy if exists "dashboard_expenses_all" on public.dashboard_expenses;
drop index if exists public.dashboard_expenses_company_period_unique;
drop table if exists public.dashboard_expenses;

alter table if exists public.invoice_line_items
  drop column if exists payout_monthly_usd_cents_snapshot,
  drop column if exists payout_total_usd_cents,
  drop column if exists profit_total_usd_cents;

alter table if exists public.invoice_realizations
  drop column if exists realized_revenue_usd_cents,
  drop column if exists realized_payout_usd_cents,
  drop column if exists realized_profit_usd_cents;

commit;
