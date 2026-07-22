create table if not exists public.pn_employee_month_summaries (
  company_id text not null,
  employee_id text not null,
  employee_name_snapshot text not null,
  payment_month text not null,
  year integer not null,
  month integer not null,
  payout_id text,
  invoice_id text,
  invoice_number text not null default '',
  days_worked numeric not null default 0,
  days_in_month numeric not null default 0,
  dollar_inward_usd_cents bigint not null default 0,
  base_dollar_inward_usd_cents bigint not null default 0,
  onboarding_advance_usd_cents bigint not null default 0,
  reimbursement_usd_cents bigint not null default 0,
  reimbursement_labels_text text not null default '',
  reimbursement_inr_cents bigint not null default 0,
  appraisal_advance_usd_cents bigint not null default 0,
  appraisal_advance_inr_cents bigint not null default 0,
  offboarding_deduction_usd_cents bigint not null default 0,
  effective_dollar_inward_usd_cents bigint not null default 0,
  cash_in_inr_cents bigint not null default 0,
  cashout_usd_inr_rate numeric not null default 0,
  paid_usd_inr_rate numeric not null default 0,
  monthly_paid_inr_cents bigint not null default 0,
  salary_paid_inr_cents bigint not null default 0,
  pf_inr_cents bigint not null default 0,
  tds_inr_cents bigint not null default 0,
  actual_paid_inr_cents bigint not null default 0,
  fx_commission_inr_cents bigint not null default 0,
  total_commission_usd_cents bigint not null default 0,
  commission_earned_inr_cents bigint not null default 0,
  gross_earnings_inr_cents bigint not null default 0,
  net_profit_inr_cents bigint not null default 0,
  is_security_deposit_month boolean not null default false,
  source_updated_at timestamptz,
  rebuilt_at timestamptz not null default now(),
  primary key (company_id, employee_id, payment_month)
);

create table if not exists public.pn_company_month_summaries (
  company_id text not null,
  payment_month text not null,
  year integer not null,
  month integer not null,
  dollar_inward_usd_cents bigint not null default 0,
  onboarding_advance_usd_cents bigint not null default 0,
  reimbursement_usd_cents bigint not null default 0,
  reimbursement_labels_text text not null default '',
  reimbursement_inr_cents bigint not null default 0,
  appraisal_advance_usd_cents bigint not null default 0,
  appraisal_advance_inr_cents bigint not null default 0,
  offboarding_deduction_usd_cents bigint not null default 0,
  effective_dollar_inward_usd_cents bigint not null default 0,
  cashout_usd_inr_rate numeric not null default 0,
  cash_in_inr_cents bigint not null default 0,
  paid_usd_inr_rate numeric not null default 0,
  monthly_paid_inr_cents bigint not null default 0,
  pf_inr_cents bigint not null default 0,
  tds_inr_cents bigint not null default 0,
  actual_paid_inr_cents bigint not null default 0,
  salary_paid_inr_cents bigint not null default 0,
  fx_commission_inr_cents bigint not null default 0,
  total_commission_usd_cents bigint not null default 0,
  commission_earned_inr_cents bigint not null default 0,
  gross_earnings_inr_cents bigint not null default 0,
  expenses_inr_cents bigint not null default 0,
  company_reimbursement_usd_cents bigint not null default 0,
  company_reimbursement_inr_cents bigint not null default 0,
  net_pl_inr_cents bigint not null default 0,
  source_updated_at timestamptz,
  rebuilt_at timestamptz not null default now(),
  primary key (company_id, payment_month)
);

create index if not exists pn_employee_month_summaries_company_month_idx
  on public.pn_employee_month_summaries (company_id, payment_month);

create index if not exists pn_employee_month_summaries_employee_month_idx
  on public.pn_employee_month_summaries (company_id, employee_id, payment_month);

create index if not exists pn_company_month_summaries_company_month_idx
  on public.pn_company_month_summaries (company_id, payment_month);

alter table public.pn_employee_month_summaries enable row level security;
alter table public.pn_company_month_summaries enable row level security;

drop policy if exists "pn_employee_month_summaries_select" on public.pn_employee_month_summaries;
drop policy if exists "pn_employee_month_summaries_modify" on public.pn_employee_month_summaries;

drop policy if exists "pn_company_month_summaries_select" on public.pn_company_month_summaries;
drop policy if exists "pn_company_month_summaries_modify" on public.pn_company_month_summaries;

do $$
declare
  helper_schema text;
begin
  helper_schema := case
    when to_regprocedure('private.has_any_page_permission(text[],text)') is not null then 'private'
    else 'public'
  end;

  execute format(
    'create policy "pn_employee_month_summaries_select"
     on public.pn_employee_month_summaries
     for select
     to authenticated
     using ((select %I.has_any_page_permission(array[''overview'', ''dashboard''], ''view'')))',
    helper_schema
  );

  execute format(
    'create policy "pn_employee_month_summaries_modify"
     on public.pn_employee_month_summaries
     for all
     to authenticated
     using ((select %I.has_any_page_permission(array[''salary'', ''employee-cash-flow'', ''invoices'', ''cashout'', ''expenses'', ''dashboard''], ''edit'')))
     with check ((select %I.has_any_page_permission(array[''salary'', ''employee-cash-flow'', ''invoices'', ''cashout'', ''expenses'', ''dashboard''], ''edit'')))',
    helper_schema,
    helper_schema
  );

  execute format(
    'create policy "pn_company_month_summaries_select"
     on public.pn_company_month_summaries
     for select
     to authenticated
     using ((select %I.has_any_page_permission(array[''overview'', ''dashboard''], ''view'')))',
    helper_schema
  );

  execute format(
    'create policy "pn_company_month_summaries_modify"
     on public.pn_company_month_summaries
     for all
     to authenticated
     using ((select %I.has_any_page_permission(array[''salary'', ''employee-cash-flow'', ''invoices'', ''cashout'', ''expenses'', ''dashboard''], ''edit'')))
     with check ((select %I.has_any_page_permission(array[''salary'', ''employee-cash-flow'', ''invoices'', ''cashout'', ''expenses'', ''dashboard''], ''edit'')))',
    helper_schema,
    helper_schema
  );
end $$;
