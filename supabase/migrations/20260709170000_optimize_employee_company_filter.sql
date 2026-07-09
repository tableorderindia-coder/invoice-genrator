create index if not exists employees_company_full_name_idx
  on public.employees (company_id, full_name);
