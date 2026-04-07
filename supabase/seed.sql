insert into companies (id, name, billing_address, default_note, created_at)
values (
  'company_acme',
  'Acme Analytics',
  '548 Market Street, San Francisco, CA',
  'Please process this invoice within the stated due date. Reach out to our team for any clarifications or backup sheets.',
  '2026-03-01T09:00:00.000Z'
)
on conflict (id) do nothing;

insert into employees (
  id,
  company_id,
  full_name,
  designation,
  default_team,
  billing_rate_usd_cents,
  payout_rate_usd_cents,
  active_from,
  active_to,
  is_active,
  created_at
)
values
  (
    'emp_ada',
    'company_acme',
    'Ada Johnson',
    'Senior Data Engineer',
    'Data Engineering',
    5500,
    3400,
    '2025-11-01',
    null,
    true,
    '2026-03-01T09:00:00.000Z'
  ),
  (
    'emp_miguel',
    'company_acme',
    'Miguel Santos',
    'Finance Analyst',
    'Finance',
    4200,
    2600,
    '2025-12-15',
    null,
    true,
    '2026-03-01T09:00:00.000Z'
  ),
  (
    'emp_priya',
    'company_acme',
    'Priya Nair',
    'Data Engineer',
    'Data Engineering',
    4800,
    3000,
    '2026-01-05',
    null,
    true,
    '2026-03-01T09:00:00.000Z'
  )
on conflict (id) do nothing;

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
values
  (
    'invoice_mar_2026',
    'company_acme',
    3,
    2026,
    'ACME-2026-03',
    '2026-03-31',
    '2026-05-31',
    'cashed_out',
    'Please process this invoice within the stated due date. Reach out to our team for any clarifications or backup sheets.',
    2057600,
    1300,
    2058900,
    null,
    '/api/invoices/invoice_mar_2026/pdf',
    '2026-03-01T09:00:00.000Z',
    '2026-03-01T09:00:00.000Z'
  ),
  (
    'invoice_apr_2026',
    'company_acme',
    4,
    2026,
    'ACME-2026-04',
    '2026-04-30',
    '2026-06-30',
    'generated',
    'Please process this invoice within the stated due date. Reach out to our team for any clarifications or backup sheets.',
    2154000,
    800,
    2154800,
    'invoice_mar_2026',
    '/api/invoices/invoice_apr_2026/pdf',
    '2026-03-01T09:00:00.000Z',
    '2026-04-30T09:00:00.000Z'
  )
on conflict (id) do nothing;

insert into invoice_teams (id, invoice_id, team_name, sort_order)
values
  ('team_mar_data', 'invoice_mar_2026', 'Data Engineering', 1),
  ('team_mar_finance', 'invoice_mar_2026', 'Finance', 2),
  ('team_apr_data', 'invoice_apr_2026', 'Data Engineering', 1),
  ('team_apr_finance', 'invoice_apr_2026', 'Finance', 2)
on conflict (id) do nothing;

insert into invoice_line_items (
  id,
  invoice_team_id,
  employee_id,
  employee_name_snapshot,
  designation_snapshot,
  team_name_snapshot,
  billing_rate_usd_cents,
  payout_rate_usd_cents,
  hours_billed,
  billed_total_usd_cents,
  payout_total_usd_cents,
  profit_total_usd_cents
)
values
  (
    'line_mar_ada',
    'team_mar_data',
    'emp_ada',
    'Ada Johnson',
    'Senior Data Engineer',
    'Data Engineering',
    5500,
    3400,
    152.00,
    836000,
    516800,
    319200
  ),
  (
    'line_mar_priya',
    'team_mar_data',
    'emp_priya',
    'Priya Nair',
    'Data Engineer',
    'Data Engineering',
    4800,
    3000,
    144.00,
    691200,
    432000,
    259200
  ),
  (
    'line_mar_miguel',
    'team_mar_finance',
    'emp_miguel',
    'Miguel Santos',
    'Finance Analyst',
    'Finance',
    4200,
    2600,
    118.00,
    495600,
    306800,
    188800
  ),
  (
    'line_apr_ada',
    'team_apr_data',
    'emp_ada',
    'Ada Johnson',
    'Senior Data Engineer',
    'Data Engineering',
    5500,
    3400,
    160.00,
    880000,
    544000,
    336000
  ),
  (
    'line_apr_priya',
    'team_apr_data',
    'emp_priya',
    'Priya Nair',
    'Data Engineer',
    'Data Engineering',
    4800,
    3000,
    150.00,
    720000,
    450000,
    270000
  ),
  (
    'line_apr_miguel',
    'team_apr_finance',
    'emp_miguel',
    'Miguel Santos',
    'Finance Analyst',
    'Finance',
    4200,
    2600,
    120.00,
    504000,
    312000,
    192000
  )
on conflict (id) do nothing;

insert into invoice_adjustments (
  id,
  invoice_id,
  type,
  label,
  employee_name,
  amount_usd_cents,
  sort_order
)
values
  (
    'adj_mar_onboarding',
    'invoice_mar_2026',
    'onboarding',
    'Onboarding support',
    'Priya Nair',
    2500,
    1
  ),
  (
    'adj_mar_offboarding',
    'invoice_mar_2026',
    'offboarding',
    'Offboarding adjustment',
    'Former contractor',
    -1200,
    2
  ),
  (
    'adj_apr_reimbursement',
    'invoice_apr_2026',
    'reimbursement',
    'Tool reimbursement',
    'Ada Johnson',
    800,
    1
  )
on conflict (id) do nothing;

insert into invoice_realizations (
  id,
  invoice_id,
  realized_at,
  realized_revenue_usd_cents,
  realized_payout_usd_cents,
  realized_profit_usd_cents,
  notes,
  created_at
)
values (
  'realization_mar_2026',
  'invoice_mar_2026',
  '2026-05-31',
  2058900,
  1255600,
  803300,
  null,
  '2026-05-31T16:00:00.000Z'
)
on conflict (id) do nothing;
