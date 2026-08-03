begin;

-- Normalize denormalized cash-flow metrics using the same peg-rate fallback as the portal.
with normalized as (
  select
    entry.id,
    entry.effective_dollar_inward_usd_cents,
    entry.actual_paid_inr_cents,
    entry.cashout_usd_inr_rate,
    case
      when entry.paid_usd_inr_rate > 0 then entry.paid_usd_inr_rate
      when entry.effective_dollar_inward_usd_cents <> 0 then
        entry.actual_paid_inr_cents::numeric / entry.effective_dollar_inward_usd_cents
      else 0
    end as effective_paid_usd_inr_rate
  from public.invoice_payment_employee_entries entry
), calculated as (
  select
    normalized.id,
    round(
      normalized.effective_dollar_inward_usd_cents *
      (normalized.cashout_usd_inr_rate - normalized.effective_paid_usd_inr_rate)
    )::bigint as fx_commission_inr_cents,
    (
      round(
        normalized.effective_dollar_inward_usd_cents *
        normalized.effective_paid_usd_inr_rate
      )::bigint - normalized.actual_paid_inr_cents
    ) as commission_earned_inr_cents
  from normalized
)
update public.invoice_payment_employee_entries entry
set
  fx_commission_inr_cents = calculated.fx_commission_inr_cents,
  commission_earned_inr_cents = calculated.commission_earned_inr_cents,
  gross_earnings_inr_cents =
    calculated.fx_commission_inr_cents + calculated.commission_earned_inr_cents
from calculated
where entry.id = calculated.id
  and (
    entry.fx_commission_inr_cents is distinct from calculated.fx_commission_inr_cents
    or entry.commission_earned_inr_cents is distinct from calculated.commission_earned_inr_cents
    or entry.gross_earnings_inr_cents is distinct from
      calculated.fx_commission_inr_cents + calculated.commission_earned_inr_cents
  );

-- Employee summaries persist the default visible employee Net P/L.
update public.pn_employee_month_summaries summary
set net_profit_inr_cents =
  summary.cash_in_inr_cents
  - summary.salary_paid_inr_cents
  - summary.pf_inr_cents
  - summary.tds_inr_cents
  - coalesce(
      summary.advance_override_inr_cents,
      round(
        summary.onboarding_advance_usd_cents * summary.cashout_usd_inr_rate
      )::bigint
    )
where summary.net_profit_inr_cents is distinct from (
  summary.cash_in_inr_cents
  - summary.salary_paid_inr_cents
  - summary.pf_inr_cents
  - summary.tds_inr_cents
  - coalesce(
      summary.advance_override_inr_cents,
      round(
        summary.onboarding_advance_usd_cents * summary.cashout_usd_inr_rate
      )::bigint
    )
);

-- Peg rates are weighted by employee Effective USD, matching monthly Dashboard rows.
with weighted_rates as (
  select
    summary.company_id,
    summary.payment_month,
    case
      when coalesce(sum(summary.effective_dollar_inward_usd_cents)
        filter (where summary.paid_usd_inr_rate > 0), 0) <= 0 then 0
      else
        sum(summary.paid_usd_inr_rate * summary.effective_dollar_inward_usd_cents)
          filter (where summary.paid_usd_inr_rate > 0)
        / sum(summary.effective_dollar_inward_usd_cents)
          filter (where summary.paid_usd_inr_rate > 0)
    end as paid_usd_inr_rate
  from public.pn_employee_month_summaries summary
  group by summary.company_id, summary.payment_month
)
update public.pn_company_month_summaries company_summary
set paid_usd_inr_rate = weighted_rates.paid_usd_inr_rate
from weighted_rates
where company_summary.company_id = weighted_rates.company_id
  and company_summary.payment_month = weighted_rates.payment_month
  and company_summary.paid_usd_inr_rate is distinct from weighted_rates.paid_usd_inr_rate;

-- Company summaries persist the default fully included period Net P/L.
update public.pn_company_month_summaries company_summary
set net_pl_inr_cents =
  company_summary.gross_earnings_inr_cents
  + company_summary.company_reimbursement_inr_cents
  - company_summary.expenses_inr_cents
  - coalesce((
      select sum(
        coalesce(
          employee_summary.advance_override_inr_cents,
          round(
            employee_summary.onboarding_advance_usd_cents *
            employee_summary.cashout_usd_inr_rate
          )::bigint
        )
      )
      from public.pn_employee_month_summaries employee_summary
      where employee_summary.company_id = company_summary.company_id
        and employee_summary.payment_month = company_summary.payment_month
    ), 0)
where company_summary.net_pl_inr_cents is distinct from (
  company_summary.gross_earnings_inr_cents
  + company_summary.company_reimbursement_inr_cents
  - company_summary.expenses_inr_cents
  - coalesce((
      select sum(
        coalesce(
          employee_summary.advance_override_inr_cents,
          round(
            employee_summary.onboarding_advance_usd_cents *
            employee_summary.cashout_usd_inr_rate
          )::bigint
        )
      )
      from public.pn_employee_month_summaries employee_summary
      where employee_summary.company_id = company_summary.company_id
        and employee_summary.payment_month = company_summary.payment_month
    ), 0)
);

comment on column public.pn_employee_month_summaries.net_profit_inr_cents is
  'Canonical employee Net P/L: effective INR inward minus salary, PF, TDS, and effective advance.';

comment on column public.pn_company_month_summaries.net_pl_inr_cents is
  'Canonical default period Net P/L: Gross P/L plus company reimbursement minus expenses and effective advances.';

commit;
