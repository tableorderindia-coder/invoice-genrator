import Link from "next/link";

import { Shell } from "./_components/shell";
import { MetricCard } from "./_components/metric-card";
import { GlassPanel } from "./_components/glass-panel";
import { StaggerGrid } from "./_components/stagger-grid";
import { getDashboardMetrics, listCompanies, listInvoices } from "@/src/features/billing/store";
import { formatMonthYear, formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const companies = await listCompanies();
  const invoices = (await listInvoices()).slice(0, 3);
  const metrics = await getDashboardMetrics();

  return (
    <Shell title="Billing cockpit for staffing ops" eyebrow="EassyOnboard">
      {/* Metric cards with 3D tilt */}
      <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stagger-item">
          <MetricCard label="Companies" value={String(companies.length)} helper="Active billing relationships" />
        </div>
        <div className="stagger-item">
          <MetricCard label="Pending cash-out" value={String(metrics.pendingCashOutCount)} helper="Operational follow-up queue" />
        </div>
        <div className="stagger-item">
          <MetricCard label="Realized profit" value={formatUsd(metrics.realizedProfitUsdCents)} helper="USD only in phase 1" />
        </div>
        <div className="stagger-item">
          <MetricCard label="Cashed out" value={String(metrics.invoiceStatusCounts.cashed_out)} helper="Safe to count in P&L" />
        </div>
      </StaggerGrid>

      {/* Main content: Workflow + Recent invoices */}
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <GlassPanel gradient>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] gradient-text">
                Monthly workflow
              </p>
              <h2 className="mt-1 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Create, send, then cash out
              </h2>
            </div>
            <Link
              href="/invoices/new"
              className="gradient-btn"
            >
              + New invoice
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              { num: "01", text: "Start invoice from a company or duplicate last month." },
              { num: "02", text: "Add teams, candidates, hours, and adjustments." },
              { num: "03", text: "Generate PDF, send it, then cash out when money lands." },
            ].map((step) => (
              <div
                key={step.num}
                className="rounded-2xl p-4 text-sm"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-secondary)",
                }}
              >
                <span
                  className="inline-block rounded-lg px-2 py-0.5 text-xs font-bold mb-2"
                  style={{ background: "var(--accent-gradient)", color: "white" }}
                >
                  {step.num}
                </span>
                <p>{step.text}</p>
              </div>
            ))}
          </div>

          <div
            className="mt-6 rounded-2xl p-5"
            style={{
              background: "rgba(99,102,241,0.05)",
              border: "1px dashed rgba(99,102,241,0.2)",
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Deployment mode
            </p>
            <p className="mt-2 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
              This app now expects a real Supabase project. Set the required Vercel environment
              variables and it will run against your production database with no mock fallback.
            </p>
          </div>
        </GlassPanel>

        <GlassPanel gradient>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] gradient-text">
                Recent invoices
              </p>
              <h2 className="mt-1 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                Live snapshot history
              </h2>
            </div>
            <Link
              href="/invoices"
              className="text-sm font-semibold underline-offset-4 hover:underline"
              style={{ color: "var(--text-accent)" }}
            >
              View all →
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="glass-card block px-4 py-4 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {invoice.invoiceNumber}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {formatMonthYear(invoice.month, invoice.year)}
                    </p>
                  </div>
                  <p
                    className="text-right text-sm font-semibold"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      color: "var(--text-primary)",
                    }}
                  >
                    {formatUsd(invoice.grandTotalUsdCents)}
                  </p>
                </div>
              </Link>
            ))}

            {invoices.length === 0 && (
              <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
                No invoices created yet. Start your first one!
              </p>
            )}
          </div>
        </GlassPanel>
      </section>
    </Shell>
  );
}
