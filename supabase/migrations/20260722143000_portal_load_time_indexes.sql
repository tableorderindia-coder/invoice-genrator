create index if not exists invoices_company_period_status_idx
  on public.invoices (company_id, year desc, month desc, status);

create index if not exists invoices_company_created_idx
  on public.invoices (company_id, created_at desc);

create index if not exists invoice_teams_invoice_idx
  on public.invoice_teams (invoice_id);

create index if not exists invoice_line_items_invoice_idx
  on public.invoice_line_items (invoice_id);

create index if not exists invoice_line_items_employee_idx
  on public.invoice_line_items (employee_id);

create index if not exists invoice_adjustments_invoice_idx
  on public.invoice_adjustments (invoice_id);

create index if not exists invoice_realizations_invoice_idx
  on public.invoice_realizations (invoice_id);

create index if not exists user_company_access_user_idx
  on public.user_company_access (user_id);

create index if not exists user_company_access_company_idx
  on public.user_company_access (company_id);

create index if not exists permissions_user_idx
  on public.permissions (user_id);
