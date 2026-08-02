alter table public.profiles
  add column if not exists overview_exclude_onboarding_advance_from_net_pl boolean not null default false;
