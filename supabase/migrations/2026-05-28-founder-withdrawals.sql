create table if not exists public.founder_withdrawals (
  id text primary key,
  company_id text references public.companies(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  founder_key text not null check (
    founder_key in (
      'nirbhay_kumar_giri',
      'pawan_kumar_beesetti',
      'vishal_savaliya'
    )
  ),
  founder_name_snapshot text not null,
  withdrawal_inr_cents bigint not null default 0 check (withdrawal_inr_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists founder_withdrawals_company_period_founder_unique
  on public.founder_withdrawals (company_id, year, month, founder_key) nulls not distinct;

create index if not exists founder_withdrawals_period_idx
  on public.founder_withdrawals (year, month);

alter table public.founder_withdrawals enable row level security;

grant select, insert, update, delete on public.founder_withdrawals to authenticated;
revoke all on public.founder_withdrawals from anon;

drop policy if exists "founder_withdrawals_select" on public.founder_withdrawals;
create policy "founder_withdrawals_select"
on public.founder_withdrawals
for select
using (public.has_any_page_permission(array['dashboard'], 'view'));

drop policy if exists "founder_withdrawals_insert" on public.founder_withdrawals;
create policy "founder_withdrawals_insert"
on public.founder_withdrawals
for insert
with check (public.has_page_permission('dashboard', 'edit'));

drop policy if exists "founder_withdrawals_update" on public.founder_withdrawals;
create policy "founder_withdrawals_update"
on public.founder_withdrawals
for update
using (public.has_page_permission('dashboard', 'edit'))
with check (public.has_page_permission('dashboard', 'edit'));
