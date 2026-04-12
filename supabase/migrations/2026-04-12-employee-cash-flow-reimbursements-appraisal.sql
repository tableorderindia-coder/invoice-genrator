alter table if exists invoice_payment_employee_entries
  add column if not exists reimbursement_usd_cents integer not null default 0 check (reimbursement_usd_cents >= 0),
  add column if not exists reimbursement_labels_text text,
  add column if not exists appraisal_advance_usd_cents integer not null default 0 check (appraisal_advance_usd_cents >= 0);
