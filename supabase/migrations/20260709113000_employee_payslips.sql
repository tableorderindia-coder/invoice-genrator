alter table public.employees
  add column if not exists pan_number text,
  add column if not exists pf_uan text;

create table if not exists public.employee_payslip_templates (
  id text primary key,
  employee_id text not null references public.employees (id) on delete cascade,
  company_id text not null references public.companies (id) on delete cascade,
  earnings jsonb not null default '[]'::jsonb,
  deductions jsonb not null default '[]'::jsonb,
  tds_income_tax_deductions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, employee_id)
);

create table if not exists public.employee_payslips (
  id text primary key,
  employee_id text not null references public.employees (id) on delete cascade,
  company_id text not null references public.companies (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  employee_name_snapshot text not null,
  pan_number text,
  pf_uan text,
  joining_date date not null,
  designation_snapshot text not null,
  effective_work_days integer not null default 0 check (effective_work_days >= 0),
  earnings jsonb not null default '[]'::jsonb,
  deductions jsonb not null default '[]'::jsonb,
  tds_earnings jsonb not null default '[]'::jsonb,
  tds_income_tax_deductions jsonb not null default '[]'::jsonb,
  tax_paid_months jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, employee_id, month)
);

create index if not exists employee_payslip_templates_company_employee_idx
  on public.employee_payslip_templates (company_id, employee_id);

create index if not exists employee_payslips_company_month_idx
  on public.employee_payslips (company_id, month);

create index if not exists employee_payslips_employee_month_idx
  on public.employee_payslips (employee_id, month);

grant select, insert, update, delete on public.employee_payslip_templates to authenticated;
grant select, insert, update, delete on public.employee_payslips to authenticated;
revoke all on public.employee_payslip_templates from anon;
revoke all on public.employee_payslips from anon;

alter table public.employee_payslip_templates enable row level security;
alter table public.employee_payslips enable row level security;

drop policy if exists "employee_payslip_templates_all" on public.employee_payslip_templates;
drop policy if exists "employee_payslips_all" on public.employee_payslips;

do $$
declare
  helper_schema text;
begin
  helper_schema := case
    when to_regprocedure('private.has_page_permission(text,text)') is not null then 'private'
    else 'public'
  end;

  execute format(
    'create policy "employee_payslip_templates_all"
     on public.employee_payslip_templates
     for all
     to authenticated
     using ((select %I.has_page_permission(''salary'', ''view'')))
     with check ((select %I.has_page_permission(''salary'', ''edit'')))',
    helper_schema,
    helper_schema
  );

  execute format(
    'create policy "employee_payslips_all"
     on public.employee_payslips
     for all
     to authenticated
     using ((select %I.has_page_permission(''salary'', ''view'')))
     with check ((select %I.has_page_permission(''salary'', ''edit'')))',
    helper_schema,
    helper_schema
  );
end $$;
