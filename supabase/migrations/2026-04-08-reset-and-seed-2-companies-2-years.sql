begin;

-- 1) Clear existing data (keeps table structures)
truncate table companies cascade;

-- 2) Seed companies
insert into companies (id, name, billing_address, default_note, created_at)
values
  (
    'company_eassyonboard',
    'EassyOnboard Solutions',
    'B-402, Surat IT Park, Surat, Gujarat, India',
    'Adjusted according to 52 weeks i.e. (hours/week * 52) / 12.',
    now()
  ),
  (
    'company_arclight',
    'Arclight Analytics Pvt Ltd',
    '9th Floor, Orion Business Hub, Pune, Maharashtra, India',
    'Adjusted according to 52 weeks i.e. (hours/week * 52) / 12.',
    now()
  );

-- 3) Seed teams (5 departments each)
insert into teams (id, company_id, name, created_at)
values
  ('team_eassy_data_eng', 'company_eassyonboard', 'Data Engineering', now()),
  ('team_eassy_finance', 'company_eassyonboard', 'Finance', now()),
  ('team_eassy_operations', 'company_eassyonboard', 'Operations', now()),
  ('team_eassy_hr', 'company_eassyonboard', 'HR', now()),
  ('team_eassy_qa', 'company_eassyonboard', 'QA', now()),
  ('team_arc_data_eng', 'company_arclight', 'Data Engineering', now()),
  ('team_arc_finance', 'company_arclight', 'Finance', now()),
  ('team_arc_operations', 'company_arclight', 'Operations', now()),
  ('team_arc_hr', 'company_arclight', 'HR', now()),
  ('team_arc_qa', 'company_arclight', 'QA', now());

-- 4) Seed employees: 20 per company (40 total), distributed across 5 departments
with seed_employees as (
  select
    c.id as company_id,
    gs as employee_idx,
    ((gs - 1) % 5) + 1 as team_slot
  from companies c
  cross join generate_series(1, 20) as gs
),
team_map as (
  select *
  from (
    values
      ('company_eassyonboard', 1, 'Data Engineering'),
      ('company_eassyonboard', 2, 'Finance'),
      ('company_eassyonboard', 3, 'Operations'),
      ('company_eassyonboard', 4, 'HR'),
      ('company_eassyonboard', 5, 'QA'),
      ('company_arclight', 1, 'Data Engineering'),
      ('company_arclight', 2, 'Finance'),
      ('company_arclight', 3, 'Operations'),
      ('company_arclight', 4, 'HR'),
      ('company_arclight', 5, 'QA')
  ) as t(company_id, team_slot, team_name)
)
insert into employees (
  id,
  company_id,
  full_name,
  designation,
  default_team,
  billing_rate_usd_cents,
  payout_monthly_usd_cents,
  hrs_per_week,
  active_from,
  active_to,
  is_active,
  created_at
)
select
  format('%s_emp_%s', se.company_id, lpad(se.employee_idx::text, 2, '0')) as id,
  se.company_id,
  format(
    '%s Employee %s',
    case
      when se.company_id = 'company_eassyonboard' then 'EOB'
      else 'ARC'
    end,
    lpad(se.employee_idx::text, 2, '0')
  ) as full_name,
  case se.team_slot
    when 1 then 'Data Engineer'
    when 2 then 'Financial Analyst'
    when 3 then 'Operations Specialist'
    when 4 then 'HR Executive'
    else 'QA Analyst'
  end as designation,
  tm.team_name as default_team,
  (3500 + ((se.employee_idx - 1) % 7) * 300) as billing_rate_usd_cents,
  (240000 + ((se.employee_idx - 1) % 8) * 18000) as payout_monthly_usd_cents,
  (36 + ((se.employee_idx - 1) % 6))::numeric(8,2) as hrs_per_week,
  date '2025-01-01' as active_from,
  null as active_to,
  true as is_active,
  now() - ((se.employee_idx % 10) || ' days')::interval as created_at
from seed_employees se
join team_map tm
  on tm.company_id = se.company_id
 and tm.team_slot = se.team_slot;

-- 5) Seed invoices for 2 years (2025, 2026)
--    8 invoices per company, 16 total; 4 pending (not cashed_out)
with invoice_seed as (
  select *
  from (
    values
      ('company_eassyonboard', 'EOB', 2025, 1,  'cashed_out'),
      ('company_eassyonboard', 'EOB', 2025, 4,  'cashed_out'),
      ('company_eassyonboard', 'EOB', 2025, 7,  'cashed_out'),
      ('company_eassyonboard', 'EOB', 2025, 10, 'cashed_out'),
      ('company_eassyonboard', 'EOB', 2026, 1,  'cashed_out'),
      ('company_eassyonboard', 'EOB', 2026, 4,  'cashed_out'),
      ('company_eassyonboard', 'EOB', 2026, 7,  'generated'),
      ('company_eassyonboard', 'EOB', 2026, 10, 'sent'),
      ('company_arclight', 'ARC', 2025, 1,  'cashed_out'),
      ('company_arclight', 'ARC', 2025, 4,  'cashed_out'),
      ('company_arclight', 'ARC', 2025, 7,  'cashed_out'),
      ('company_arclight', 'ARC', 2025, 10, 'cashed_out'),
      ('company_arclight', 'ARC', 2026, 1,  'cashed_out'),
      ('company_arclight', 'ARC', 2026, 4,  'cashed_out'),
      ('company_arclight', 'ARC', 2026, 7,  'draft'),
      ('company_arclight', 'ARC', 2026, 10, 'generated')
  ) as t(company_id, invoice_code, year, month, status)
)
insert into invoices (
  id,
  company_id,
  month,
  year,
  invoice_number,
  billing_date,
  due_date,
  status,
  note_text,
  subtotal_usd_cents,
  adjustments_usd_cents,
  grand_total_usd_cents,
  source_invoice_id,
  pdf_path,
  created_at,
  updated_at
)
select
  format('invoice_%s_%s_%s', s.invoice_code, s.year, lpad(s.month::text, 2, '0')) as id,
  s.company_id,
  s.month,
  s.year,
  format('%s-%s-%s', s.invoice_code, s.year, lpad(s.month::text, 2, '0')) as invoice_number,
  make_date(s.year, s.month, 1) as billing_date,
  (make_date(s.year, s.month, 1) + interval '45 days')::date as due_date,
  s.status::text as status,
  c.default_note as note_text,
  0,
  0,
  0,
  null,
  format('/api/invoices/%s/pdf', format('invoice_%s_%s_%s', s.invoice_code, s.year, lpad(s.month::text, 2, '0'))),
  now(),
  now()
from invoice_seed s
join companies c on c.id = s.company_id;

-- 6) Add invoice teams (all available company teams per invoice)
insert into invoice_teams (id, invoice_id, team_name, sort_order)
select
  format('it_%s_%s', i.id, row_number() over (partition by i.id order by t.name)) as id,
  i.id as invoice_id,
  t.name as team_name,
  row_number() over (partition by i.id order by t.name) as sort_order
from invoices i
join teams t
  on t.company_id = i.company_id;

-- 7) Add line items: top 2 employees per team in each invoice
with team_employee_rank as (
  select
    e.*,
    row_number() over (
      partition by e.company_id, lower(btrim(e.default_team))
      order by e.full_name
    ) as rn_team
  from employees e
),
selected_team_employees as (
  select *
  from team_employee_rank
  where rn_team <= 2
)
insert into invoice_line_items (
  id,
  invoice_team_id,
  employee_id,
  employee_name_snapshot,
  designation_snapshot,
  team_name_snapshot,
  billing_rate_usd_cents,
  payout_monthly_usd_cents_snapshot,
  hrs_per_week,
  billed_total_usd_cents,
  payout_total_usd_cents,
  profit_total_usd_cents
)
select
  format(
    'li_%s_%s',
    it.id,
    row_number() over (partition by it.id order by ste.full_name)
  ) as id,
  it.id as invoice_team_id,
  ste.id as employee_id,
  ste.full_name as employee_name_snapshot,
  ste.designation as designation_snapshot,
  ste.default_team as team_name_snapshot,
  ste.billing_rate_usd_cents,
  ste.payout_monthly_usd_cents,
  ste.hrs_per_week,
  round((ste.billing_rate_usd_cents::numeric * ste.hrs_per_week * 52) / 12)::integer as billed_total_usd_cents,
  ste.payout_monthly_usd_cents as payout_total_usd_cents,
  (
    round((ste.billing_rate_usd_cents::numeric * ste.hrs_per_week * 52) / 12)::integer
    - ste.payout_monthly_usd_cents
  ) as profit_total_usd_cents
from invoice_teams it
join invoices i
  on i.id = it.invoice_id
join selected_team_employees ste
  on ste.company_id = i.company_id
 and lower(btrim(ste.default_team)) = lower(btrim(it.team_name));

-- 8) Seed adjustments (multiple categories)
with invoice_rank as (
  select
    i.*,
    row_number() over (partition by i.company_id order by i.year, i.month) as rn_company
  from invoices i
)
insert into invoice_adjustments (
  id,
  invoice_id,
  type,
  label,
  employee_name,
  rate_usd_cents,
  hrs_per_week,
  amount_usd_cents,
  sort_order
)
select
  format('adj_%s_reim', ir.id),
  ir.id,
  'reimbursement',
  'Travel / internet reimbursement',
  null,
  null,
  null,
  (12000 + ir.month * 100),
  1
from invoice_rank ir
union all
select
  format('adj_%s_onb', ir.id),
  ir.id,
  'onboarding',
  'Onboarding advance',
  format('New Joiner %s', lpad(ir.rn_company::text, 2, '0')),
  2800,
  4,
  round((2800::numeric * 4 * 52) / 12)::integer,
  2
from invoice_rank ir
where (ir.rn_company % 2) = 1
union all
select
  format('adj_%s_off', ir.id),
  ir.id,
  'offboarding',
  'Offboarding deduction',
  format('Exit Member %s', lpad(ir.rn_company::text, 2, '0')),
  2600,
  3,
  -round((2600::numeric * 3 * 52) / 12)::integer,
  3
from invoice_rank ir
where (ir.rn_company % 2) = 0
union all
select
  format('adj_%s_app', ir.id),
  ir.id,
  'appraisal',
  'Appraisal advance',
  format('Appraisal %s', lpad(ir.rn_company::text, 2, '0')),
  3000,
  2,
  round((3000::numeric * 2 * 52) / 12)::integer,
  4
from invoice_rank ir
where ir.month in (4, 10);

-- 9) Recompute invoice totals after line items + adjustments
with line_totals as (
  select
    it.invoice_id,
    sum(li.billed_total_usd_cents)::integer as subtotal_usd_cents,
    sum(li.payout_total_usd_cents)::integer as payout_usd_cents
  from invoice_line_items li
  join invoice_teams it on it.id = li.invoice_team_id
  group by it.invoice_id
),
adjustment_totals as (
  select
    ia.invoice_id,
    sum(ia.amount_usd_cents)::integer as adjustments_usd_cents
  from invoice_adjustments ia
  group by ia.invoice_id
)
update invoices i
set
  subtotal_usd_cents = coalesce(lt.subtotal_usd_cents, 0),
  adjustments_usd_cents = coalesce(at.adjustments_usd_cents, 0),
  grand_total_usd_cents = coalesce(lt.subtotal_usd_cents, 0) + coalesce(at.adjustments_usd_cents, 0),
  updated_at = now()
from line_totals lt
left join adjustment_totals at on at.invoice_id = lt.invoice_id
where i.id = lt.invoice_id;

-- 10) Realizations for cashed_out invoices only
with payout_totals as (
  select
    it.invoice_id,
    sum(li.payout_total_usd_cents)::integer as realized_payout_usd_cents
  from invoice_line_items li
  join invoice_teams it on it.id = li.invoice_team_id
  group by it.invoice_id
)
insert into invoice_realizations (
  id,
  invoice_id,
  realized_at,
  dollar_inbound_usd_cents,
  usd_inr_rate,
  realized_revenue_usd_cents,
  realized_payout_usd_cents,
  realized_profit_usd_cents,
  notes,
  created_at
)
select
  format('real_%s', i.id) as id,
  i.id as invoice_id,
  (i.due_date + interval '60 days')::date as realized_at,
  greatest(i.grand_total_usd_cents - (900 + ((i.month % 4) * 300)), 0)::integer as dollar_inbound_usd_cents,
  (82.10 + ((i.month % 5) * 0.35))::numeric(12,4) as usd_inr_rate,
  i.grand_total_usd_cents as realized_revenue_usd_cents,
  coalesce(pt.realized_payout_usd_cents, 0) as realized_payout_usd_cents,
  (
    greatest(i.grand_total_usd_cents - (900 + ((i.month % 4) * 300)), 0)
    - coalesce(pt.realized_payout_usd_cents, 0)
  )::integer as realized_profit_usd_cents,
  'Auto-seeded cashout',
  now()
from invoices i
left join payout_totals pt on pt.invoice_id = i.id
where i.status = 'cashed_out';

-- 11) Employee payout rows for cashed_out invoices
with cashed_line_items as (
  select
    i.id as invoice_id,
    i.company_id,
    li.id as line_item_id,
    li.employee_id,
    li.employee_name_snapshot,
    li.billed_total_usd_cents,
    li.payout_monthly_usd_cents_snapshot,
    r.usd_inr_rate as cashout_rate,
    row_number() over (partition by i.id order by li.id) as row_idx
  from invoices i
  join invoice_realizations r on r.invoice_id = i.id
  join invoice_teams it on it.invoice_id = i.id
  join invoice_line_items li on li.invoice_team_id = it.id
  where i.status = 'cashed_out'
)
insert into employee_payouts (
  id,
  invoice_id,
  company_id,
  employee_id,
  invoice_line_item_id,
  employee_name_snapshot,
  dollar_inward_usd_cents,
  employee_monthly_usd_cents,
  cashout_usd_inr_rate,
  paid_usd_inr_rate,
  pf_inr_cents,
  tds_inr_cents,
  actual_paid_inr_cents,
  fx_commission_inr_cents,
  total_commission_usd_cents,
  commission_earned_inr_cents,
  is_non_invoice_employee,
  is_paid,
  paid_at,
  created_at,
  updated_at
)
select
  format('ep_%s_%s', cli.invoice_id, row_number() over (partition by cli.invoice_id order by cli.line_item_id)) as id,
  cli.invoice_id,
  cli.company_id,
  cli.employee_id,
  cli.line_item_id,
  cli.employee_name_snapshot,
  cli.billed_total_usd_cents,
  cli.payout_monthly_usd_cents_snapshot,
  cli.cashout_rate,
  greatest(cli.cashout_rate - (0.40 + ((cli.row_idx % 4) * 0.12)), 1)::numeric(12,4) as paid_usd_inr_rate,
  0 as pf_inr_cents,
  0 as tds_inr_cents,
  0 as actual_paid_inr_cents,
  round(
    (
      cli.cashout_rate
      - greatest(cli.cashout_rate - (0.40 + ((cli.row_idx % 4) * 0.12)), 1)
    ) * cli.payout_monthly_usd_cents_snapshot
  )::bigint as fx_commission_inr_cents,
  (cli.billed_total_usd_cents - cli.payout_monthly_usd_cents_snapshot) as total_commission_usd_cents,
  round(
    (cli.billed_total_usd_cents * cli.cashout_rate)
    - (
        cli.payout_monthly_usd_cents_snapshot
        * greatest(cli.cashout_rate - (0.40 + ((cli.row_idx % 4) * 0.12)), 1)
      )
    - round(
        (
          cli.cashout_rate
          - greatest(cli.cashout_rate - (0.40 + ((cli.row_idx % 4) * 0.12)), 1)
        ) * cli.payout_monthly_usd_cents_snapshot
      )
  )::bigint as commission_earned_inr_cents,
  false as is_non_invoice_employee,
  false as is_paid,
  null as paid_at,
  now(),
  now()
from cashed_line_items cli;

-- 12) Dashboard expenses (manual-expense table demo data)
insert into dashboard_expenses (
  id,
  company_id,
  period_type,
  year,
  month,
  amount_inr_cents,
  created_at,
  updated_at
)
values
  ('exp_eob_2025_y', 'company_eassyonboard', 'yearly', 2025, null, 9500000, now(), now()),
  ('exp_eob_2026_y', 'company_eassyonboard', 'yearly', 2026, null, 11200000, now(), now()),
  ('exp_arc_2025_y', 'company_arclight', 'yearly', 2025, null, 8800000, now(), now()),
  ('exp_arc_2026_y', 'company_arclight', 'yearly', 2026, null, 10500000, now(), now()),
  ('exp_eob_2025_01', 'company_eassyonboard', 'monthly', 2025, 1, 620000, now(), now()),
  ('exp_eob_2025_04', 'company_eassyonboard', 'monthly', 2025, 4, 640000, now(), now()),
  ('exp_eob_2025_07', 'company_eassyonboard', 'monthly', 2025, 7, 655000, now(), now()),
  ('exp_eob_2025_10', 'company_eassyonboard', 'monthly', 2025, 10, 690000, now(), now()),
  ('exp_eob_2026_01', 'company_eassyonboard', 'monthly', 2026, 1, 710000, now(), now()),
  ('exp_eob_2026_04', 'company_eassyonboard', 'monthly', 2026, 4, 735000, now(), now()),
  ('exp_arc_2025_01', 'company_arclight', 'monthly', 2025, 1, 590000, now(), now()),
  ('exp_arc_2025_04', 'company_arclight', 'monthly', 2025, 4, 605000, now(), now()),
  ('exp_arc_2025_07', 'company_arclight', 'monthly', 2025, 7, 620000, now(), now()),
  ('exp_arc_2025_10', 'company_arclight', 'monthly', 2025, 10, 645000, now(), now()),
  ('exp_arc_2026_01', 'company_arclight', 'monthly', 2026, 1, 670000, now(), now()),
  ('exp_arc_2026_04', 'company_arclight', 'monthly', 2026, 4, 700000, now(), now());

commit;
