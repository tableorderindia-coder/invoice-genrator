alter table employee_statement_invoice_rows
  add column if not exists appraisal_advance_usd_cents integer not null default 0;

alter table employee_statement_invoice_rows
  drop constraint if exists employee_statement_invoice_rows_appraisal_advance_nonnegative;

alter table employee_statement_invoice_rows
  add constraint employee_statement_invoice_rows_appraisal_advance_nonnegative
  check (appraisal_advance_usd_cents >= 0);
