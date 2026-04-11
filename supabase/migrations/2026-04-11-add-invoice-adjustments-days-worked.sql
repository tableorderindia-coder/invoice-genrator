alter table invoice_adjustments
  add column if not exists days_worked integer;
