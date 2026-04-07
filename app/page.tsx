import Link from "next/link";

import { Shell } from "./_components/shell";
import { getDashboardMetrics, listCompanies, listInvoices } from "@/src/features/billing/store";
import { formatMonthYear, formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const companies = await listCompanies();
  const invoices = (await listInvoices()).slice(0, 3);
  const metrics = await getDashboardMetrics();

  return (
    <Shell title="Billing cockpit for staffing ops" eyebrow="EassyOnboard">
      <section className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="Companies" value={String(companies.length)} helper="Active billing relationships" />
        <MetricCard label="Invoices waiting on cash-out" value={String(metrics.pendingCashOutCount)} helper="Operational follow-up queue" />
        <MetricCard label="Realized profit" value={formatUsd(metrics.realizedProfitUsdCents)} helper="USD only in phase 1" />
        <MetricCard label="Cashed out invoices" value={String(metrics.invoiceStatusCounts.cashed_out)} helper="Safe to count in P&L" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Monthly workflow</p>
              <h2 className="mt-1 text-2xl font-semibold">Create, send, then cash out</h2>
            </div>
            <Link
              href="/invoices/new"
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              New invoice
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              "1. Start invoice from a company or duplicate last month.",
              "2. Add teams, candidates, hours, and adjustments.",
              "3. Generate PDF, send it, then cash out when money lands.",
            ].map((step) => (
              <div key={step} className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                {step}
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 p-5">
            <p className="text-sm font-semibold text-slate-900">Deployment mode</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              This app now expects a real Supabase project. Set the required Vercel environment
              variables and it will run against your production database with no mock fallback.
            </p>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700">Recent invoices</p>
              <h2 className="mt-1 text-2xl font-semibold">Live snapshot history</h2>
            </div>
            <Link href="/invoices" className="text-sm font-semibold text-slate-900 underline-offset-4 hover:underline">
              View all
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="block rounded-3xl border border-slate-200 px-4 py-4 transition hover:border-slate-900"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-slate-500">
                      {formatMonthYear(invoice.month, invoice.year)}
                    </p>
                  </div>
                  <p className="text-right text-sm font-semibold text-slate-900">
                    {formatUsd(invoice.grandTotalUsdCents)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{helper}</p>
    </div>
  );
}
