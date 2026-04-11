begin;

do $$
declare
  v_company_id text;
begin
  select id
  into v_company_id
  from companies
  where lower(btrim(name)) = lower(btrim('The Arena Platform, Inc.'))
  limit 1;

  if v_company_id is null then
    raise exception 'Company "The Arena Platform, Inc." not found. Create it first.';
  end if;

  -- 1) cleanup existing data for this company only
  delete from security_deposit_ledger where company_id = v_company_id;
  delete from employee_payouts where company_id = v_company_id;
  delete from dashboard_expenses where company_id = v_company_id;
  delete from invoice_realizations
  where invoice_id in (select id from invoices where company_id = v_company_id);
  delete from invoice_adjustments
  where invoice_id in (select id from invoices where company_id = v_company_id);
  delete from invoice_line_items
  where invoice_team_id in (
    select it.id
    from invoice_teams it
    join invoices i on i.id = it.invoice_id
    where i.company_id = v_company_id
  );
  delete from invoice_teams
  where invoice_id in (select id from invoices where company_id = v_company_id);
  delete from invoices where company_id = v_company_id;
  delete from employees where company_id = v_company_id;
  delete from teams where company_id = v_company_id;

  -- 2) seed source from PnL - USD Employee Sheet (1).csv
  create temporary table tmp_arena_seed (
    full_name text not null,
    default_team text not null,
    designation text not null,
    onboarding_inward_cents integer not null,
    aug_inward_cents integer not null,
    aug_payment_cents integer not null,
    sep_inward_cents integer not null,
    sep_payment_cents integer not null,
    oct_inward_cents integer not null,
    oct_payment_cents integer not null,
    nov_inward_cents integer not null,
    nov_payment_cents integer not null,
    dec_inward_cents integer not null,
    dec_payment_cents integer not null,
    jan_inward_cents integer not null,
    jan_payment_cents integer not null,
    feb_inward_cents integer not null,
    feb_payment_cents integer not null,
    mar_inward_cents integer not null,
    mar_payment_cents integer not null
  ) on commit drop;

  insert into tmp_arena_seed values
    ('Pawan Kumar Beesetti', 'Data Engineering', 'Data Engineer', 1109300, 0, 554700, 0, 554600, 554700, 554700, 554700, 554700, 554700, 554700, 554700, 554700, 554700, 589400, 554700, 624000),
    ('Nirbhay Kumar Giri', 'Finance', 'Financial Analyst', 1040000, 0, 520000, 0, 520000, 520000, 520000, 520000, 520000, 520000, 520000, 520000, 572000, 624000, 606700, 572000, 606700),
    ('Vishal Savaliya', 'Operations', 'Operations Specialist', 450600, 0, 225300, 0, 225300, 225300, 225300, 225300, 225300, 225300, 225300, 225300, 312000, 398700, 312000, 312000, 312000),
    ('Srmrati Rathaur', 'Data Engineering', 'Data Engineer', 589300, 0, 294700, 0, 294600, 294700, 294700, 294700, 294700, 294700, 294700, 294700, 294700, 294700, 294700, 294700, 294700),
    ('Vivek Yadav', 'Finance', 'Financial Analyst', 208000, 0, 104000, 0, 104000, 104000, 104000, 104000, 138700, 136000, 138700, 138700, 138700, 138700, 176100, 138700, 176100, 138700),
    ('Lokeswar Beesetti', 'Operations', 'Operations Specialist', 173400, 0, 86700, 0, 86700, 86700, 86700, 86700, 121400, 118700, 121400, 121400, 121400, 121400, 158800, 121400, 158800, 121400),
    ('Utkarsh Dwivedi', 'Data Engineering', 'Data Engineer', 312000, 0, 78000, 0, 156000, 78000, 156000, 156000, 156000, 156000, 156000, 156000, 156000, 156000, 156000, 156000, 156000),
    ('Ratnesh Kumar', 'Finance', 'Financial Analyst', 277400, 0, 69400, 0, 138700, 69400, 138700, 138700, 138700, 138700, 138700, 138700, 138700, 138700, 138700, 138700, 138700),
    ('Sri Varshini', 'Operations', 'Operations Specialist', 173400, 0, 43400, 0, 86600, 43400, 86600, 86600, 86600, 86600, 86600, 86600, 86600, 86600, 86600, 86600, 86600),
    ('Darshan Bandache', 'Data Engineering', 'Data Engineer', 260000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 121600, 0, 130000, 130000, 130000, 130000, 130000),
    ('Nagotra Anand Prasad Singh', 'Finance', 'Financial Analyst', 260000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 121600, 0, 130000, 130000, 130000, 130000, 130000),
    ('Lakshay Chaudhary', 'Operations', 'Operations Specialist', 260000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 83900, 0, 130000, 83900, 0);

  create temporary table tmp_arena_periods (
    period_key text primary key,
    year integer not null,
    month integer not null,
    slug text not null,
    invoice_id text not null,
    invoice_number text not null,
    billing_date date not null,
    due_date date not null,
    cashout_rate numeric(12,4) not null
  ) on commit drop;

  insert into tmp_arena_periods values
    ('onboarding', 2025, 8, 'onboarding', 'invoice_arena_2025_08_onboarding', 'ARENA-2025-08-ONB', '2025-08-01', '2025-09-15', 87.8700),
    ('aug',        2025, 8, 'august',     'invoice_arena_2025_08_august',     'ARENA-2025-08-AUG', '2025-08-01', '2025-09-15', 87.8700),
    ('sep',        2025, 9, 'september',  'invoice_arena_2025_09_september',  'ARENA-2025-09-SEP', '2025-09-01', '2025-10-16', 88.0400),
    ('oct',        2025, 10,'october',    'invoice_arena_2025_10_october',    'ARENA-2025-10-OCT', '2025-10-01', '2025-11-15', 89.2500),
    ('nov',        2025, 11,'november',   'invoice_arena_2025_11_november',   'ARENA-2025-11-NOV', '2025-11-01', '2025-12-16', 90.1100),
    ('dec',        2025, 12,'december',   'invoice_arena_2025_12_december',   'ARENA-2025-12-DEC', '2025-12-01', '2026-01-15', 91.6400),
    ('jan',        2026, 1, 'january',    'invoice_arena_2026_01_january',    'ARENA-2026-01-JAN', '2026-01-01', '2026-02-15', 90.7100),
    ('feb',        2026, 2, 'february',   'invoice_arena_2026_02_february',   'ARENA-2026-02-FEB', '2026-02-01', '2026-03-18', 91.6400),
    ('mar',        2026, 3, 'march',      'invoice_arena_2026_03_march',      'ARENA-2026-03-MAR', '2026-03-01', '2026-04-15', 91.0000);

  create temporary table tmp_arena_employee_monthly (
    employee_id text not null,
    full_name text not null,
    team_name text not null,
    designation text not null,
    period_key text not null,
    inward_cents integer not null,
    payment_cents integer not null,
    primary key (employee_id, period_key)
  ) on commit drop;

  insert into tmp_arena_employee_monthly (
    employee_id,
    full_name,
    team_name,
    designation,
    period_key,
    inward_cents,
    payment_cents
  )
  select
    'emp_arena_' || lower(regexp_replace(s.full_name, '[^a-zA-Z0-9]+', '_', 'g')) as employee_id,
    s.full_name,
    s.default_team,
    s.designation,
    p.period_key,
    case p.period_key
      when 'onboarding' then s.onboarding_inward_cents
      when 'aug' then s.aug_inward_cents
      when 'sep' then s.sep_inward_cents
      when 'oct' then s.oct_inward_cents
      when 'nov' then s.nov_inward_cents
      when 'dec' then s.dec_inward_cents
      when 'jan' then s.jan_inward_cents
      when 'feb' then s.feb_inward_cents
      when 'mar' then s.mar_inward_cents
      else 0
    end as inward_cents,
    case p.period_key
      when 'onboarding' then 0
      when 'aug' then s.aug_payment_cents
      when 'sep' then s.sep_payment_cents
      when 'oct' then s.oct_payment_cents
      when 'nov' then s.nov_payment_cents
      when 'dec' then s.dec_payment_cents
      when 'jan' then s.jan_payment_cents
      when 'feb' then s.feb_payment_cents
      when 'mar' then s.mar_payment_cents
      else 0
    end as payment_cents
  from tmp_arena_seed s
  cross join tmp_arena_periods p;

  -- 3) create canonical teams
  insert into teams (id, company_id, name, created_at)
  values
    ('team_arena_data_engineering', v_company_id, 'Data Engineering', now()),
    ('team_arena_finance', v_company_id, 'Finance', now()),
    ('team_arena_operations', v_company_id, 'Operations', now());

  -- 4) create employees
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
    em.employee_id,
    v_company_id,
    em.full_name,
    em.designation,
    em.team_name,
    2500,
    max(case when em.period_key = 'mar' then em.payment_cents else 0 end),
    40,
    date '2025-08-01',
    null,
    true,
    now()
  from tmp_arena_employee_monthly em
  group by em.employee_id, em.full_name, em.designation, em.team_name;

  -- 5) create invoices
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
    p.invoice_id,
    v_company_id,
    p.month,
    p.year,
    p.invoice_number,
    p.billing_date,
    p.due_date,
    'cashed_out',
    'Imported from PnL - USD Employee Sheet (1).csv',
    0,
    0,
    0,
    null,
    '/api/invoices/' || p.invoice_id || '/pdf',
    now(),
    now()
  from tmp_arena_periods p
  order by p.year, p.month, p.period_key;

  -- 6) create invoice team buckets
  insert into invoice_teams (id, invoice_id, team_name, sort_order)
  select
    'it_' || p.invoice_id || '_' || lower(regexp_replace(t.name, '[^a-zA-Z0-9]+', '_', 'g')),
    p.invoice_id,
    t.name,
    row_number() over (partition by p.invoice_id order by t.name)
  from tmp_arena_periods p
  cross join (
    select unnest(array['Data Engineering', 'Finance', 'Operations']) as name
  ) as t;

  -- 7) create line items per employee per month
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
    'li_' || p.invoice_id || '_' || em.employee_id,
    'it_' || p.invoice_id || '_' || lower(regexp_replace(em.team_name, '[^a-zA-Z0-9]+', '_', 'g')),
    em.employee_id,
    em.full_name,
    em.designation,
    em.team_name,
    2500,
    em.payment_cents,
    40,
    case when em.period_key = 'onboarding' then 0 else em.inward_cents end,
    case when em.period_key = 'onboarding' then 0 else em.payment_cents end,
    case when em.period_key = 'onboarding' then 0 else em.inward_cents - em.payment_cents end
  from tmp_arena_employee_monthly em
  join tmp_arena_periods p on p.period_key = em.period_key;

  -- 8) onboarding adjustments (security deposits)
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
    'adj_' || p.invoice_id || '_' || em.employee_id || '_onboarding',
    p.invoice_id,
    'onboarding',
    'Security deposit',
    em.full_name,
    null,
    null,
    em.inward_cents,
    row_number() over (order by em.full_name)
  from tmp_arena_employee_monthly em
  join tmp_arena_periods p on p.period_key = em.period_key
  where em.period_key = 'onboarding'
    and em.inward_cents > 0;

  -- 9) recompute invoice totals
  with line_totals as (
    select
      it.invoice_id,
      sum(li.billed_total_usd_cents)::integer as subtotal_usd_cents
    from invoice_teams it
    join invoice_line_items li on li.invoice_team_id = it.id
    where it.invoice_id in (select invoice_id from tmp_arena_periods)
    group by it.invoice_id
  ),
  adjustment_totals as (
    select
      ia.invoice_id,
      sum(ia.amount_usd_cents)::integer as adjustments_usd_cents
    from invoice_adjustments ia
    where ia.invoice_id in (select invoice_id from tmp_arena_periods)
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

  -- 10) realizations from the imported monthly sheet
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
    'real_' || p.invoice_id,
    p.invoice_id,
    (p.billing_date + interval '27 days')::date,
    sum(em.inward_cents)::integer as dollar_inbound_usd_cents,
    p.cashout_rate,
    sum(em.inward_cents)::integer as realized_revenue_usd_cents,
    sum(em.payment_cents)::integer as realized_payout_usd_cents,
    (sum(em.inward_cents) - sum(em.payment_cents))::integer as realized_profit_usd_cents,
    'Imported from PnL - USD Employee Sheet (1).csv',
    now()
  from tmp_arena_periods p
  join tmp_arena_employee_monthly em on em.period_key = p.period_key
  group by p.invoice_id, p.billing_date, p.cashout_rate;

  -- 11) payout rows per invoice employee
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
    'ep_' || p.invoice_id || '_' || em.employee_id,
    p.invoice_id,
    v_company_id,
    em.employee_id,
    'li_' || p.invoice_id || '_' || em.employee_id,
    em.full_name,
    em.inward_cents,
    case when em.period_key = 'onboarding' then 0 else em.payment_cents end,
    p.cashout_rate,
    case when em.period_key = 'onboarding' then null else p.cashout_rate end,
    0,
    0,
    0,
    0,
    case when em.period_key = 'onboarding' then em.inward_cents else em.inward_cents - em.payment_cents end,
    case
      when em.period_key = 'onboarding'
        then round(em.inward_cents * p.cashout_rate)::bigint
      else
        round((em.inward_cents - em.payment_cents) * p.cashout_rate)::bigint
    end,
    false,
    false,
    null,
    now(),
    now()
  from tmp_arena_employee_monthly em
  join tmp_arena_periods p on p.period_key = em.period_key;

  -- 12) security deposit ledger from onboarding advance rows
  insert into security_deposit_ledger (
    id,
    company_id,
    employee_id,
    invoice_id,
    adjustment_id,
    movement_type,
    amount_usd_cents,
    created_at
  )
  select
    'sdl_' || p.invoice_id || '_' || em.employee_id,
    v_company_id,
    em.employee_id,
    p.invoice_id,
    'adj_' || p.invoice_id || '_' || em.employee_id || '_onboarding',
    'credit',
    em.inward_cents,
    now()
  from tmp_arena_employee_monthly em
  join tmp_arena_periods p on p.period_key = em.period_key
  where em.period_key = 'onboarding'
    and em.inward_cents > 0;
end $$;

commit;
