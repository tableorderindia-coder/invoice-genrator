alter table public.invoice_payment_employee_entries
  add column if not exists advance_override_inr_cents bigint;

alter table public.pn_employee_month_summaries
  add column if not exists advance_override_inr_cents bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'invoice_payment_employee_entries_advance_override_nonnegative'
      and conrelid = 'public.invoice_payment_employee_entries'::regclass
  ) then
    alter table public.invoice_payment_employee_entries
      add constraint invoice_payment_employee_entries_advance_override_nonnegative
      check (advance_override_inr_cents is null or advance_override_inr_cents >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'pn_employee_month_summaries_advance_override_nonnegative'
      and conrelid = 'public.pn_employee_month_summaries'::regclass
  ) then
    alter table public.pn_employee_month_summaries
      add constraint pn_employee_month_summaries_advance_override_nonnegative
      check (advance_override_inr_cents is null or advance_override_inr_cents >= 0);
  end if;
end $$;
