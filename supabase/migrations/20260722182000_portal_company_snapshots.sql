begin;

create table if not exists public.portal_company_snapshots (
  company_id text not null,
  snapshot_type text not null,
  month_key text not null default '',
  payload_json jsonb not null,
  source_version text not null default '',
  rebuilt_at timestamptz not null default now(),
  primary key (company_id, snapshot_type, month_key)
);

create index if not exists portal_company_snapshots_company_type_idx
  on public.portal_company_snapshots (company_id, snapshot_type);

grant select, insert, update, delete on public.portal_company_snapshots to authenticated;
revoke all on public.portal_company_snapshots from anon;

alter table public.portal_company_snapshots enable row level security;

drop policy if exists "portal_company_snapshots_select" on public.portal_company_snapshots;
drop policy if exists "portal_company_snapshots_modify" on public.portal_company_snapshots;

do $$
declare
  helper_schema text;
begin
  helper_schema := case
    when to_regprocedure('private.has_any_page_permission(text[],text)') is not null then 'private'
    else 'public'
  end;

  execute format(
    'create policy "portal_company_snapshots_select"
     on public.portal_company_snapshots
     for select
     using (
       company_id = ''__global__''
       or (select %I.has_any_page_permission(array[
         ''companies'',
         ''employees'',
         ''salary'',
         ''invoices'',
         ''cashout'',
         ''employee-cash-flow'',
         ''employee-statements'',
         ''expenses'',
         ''dashboard''
       ], ''view''))
     )',
    helper_schema
  );

  execute format(
    'create policy "portal_company_snapshots_modify"
     on public.portal_company_snapshots
     for all
     using ((select %I.has_any_page_permission(array[
       ''companies'',
       ''employees'',
       ''salary'',
       ''invoices'',
       ''cashout'',
       ''employee-cash-flow'',
       ''employee-statements'',
       ''expenses'',
       ''dashboard''
     ], ''edit'')))
     with check ((select %I.has_any_page_permission(array[
       ''companies'',
       ''employees'',
       ''salary'',
       ''invoices'',
       ''cashout'',
       ''employee-cash-flow'',
       ''employee-statements'',
       ''expenses'',
       ''dashboard''
     ], ''edit'')))',
    helper_schema,
    helper_schema
  );
end $$;

commit;
