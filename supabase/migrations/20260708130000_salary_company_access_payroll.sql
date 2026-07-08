alter table public.permissions
  drop constraint if exists permissions_page_check;

alter table public.permissions
  add constraint permissions_page_check check (
    page in (
      'overview',
      'companies',
      'employees',
      'invoices',
      'cashout',
      'employee-cash-flow',
      'employee-statements',
      'salary',
      'expenses',
      'dashboard',
      'admin-users'
    )
  );

create table if not exists public.user_company_access (
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id text not null references public.companies (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, company_id)
);

grant select, insert, update, delete on public.user_company_access to authenticated;
revoke all on public.user_company_access from anon;
alter table public.user_company_access enable row level security;

drop policy if exists "user_company_access_select" on public.user_company_access;
create policy "user_company_access_select"
on public.user_company_access
for select
to authenticated
using ((select private.is_admin()) or user_id = (select auth.uid()));

drop policy if exists "user_company_access_modify" on public.user_company_access;
create policy "user_company_access_modify"
on public.user_company_access
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
