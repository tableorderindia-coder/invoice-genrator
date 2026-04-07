import { Shell } from "../_components/shell";
import { MetricCard } from "../_components/metric-card";
import { GlassPanel } from "../_components/glass-panel";
import { StaggerGrid } from "../_components/stagger-grid";
import { getDashboardMetrics } from "@/src/features/billing/store";
import { formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  // Find max profit for relative bar sizing
  const maxCompanyProfit = Math.max(
    ...metrics.realizedProfitByCompany.map((c) => Math.abs(c.realizedProfitUsdCents)),
    1,
  );
  const maxEmployeeProfit = Math.max(
    ...metrics.realizedProfitByEmployee.map((e) => Math.abs(e.realizedProfitUsdCents)),
    1,
  );

  return (
    <Shell title="Dashboard" eyebrow="Realized profit only">
      <StaggerGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stagger-item">
          <MetricCard label="Draft invoices" value={String(metrics.invoiceStatusCounts.draft)} />
        </div>
        <div className="stagger-item">
          <MetricCard label="Generated" value={String(metrics.invoiceStatusCounts.generated)} />
        </div>
        <div className="stagger-item">
          <MetricCard label="Sent" value={String(metrics.invoiceStatusCounts.sent)} />
        </div>
        <div className="stagger-item">
          <MetricCard label="Realized profit" value={formatUsd(metrics.realizedProfitUsdCents)} />
        </div>
      </StaggerGrid>

      <section className="grid gap-6 lg:grid-cols-2">
        <GlassPanel title="Profit by company" gradient>
          <div className="space-y-3">
            {metrics.realizedProfitByCompany.map((item) => {
              const pct = Math.round(
                (Math.abs(item.realizedProfitUsdCents) / maxCompanyProfit) * 100,
              );
              return (
                <div key={item.companyId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                      {item.companyName}
                    </span>
                    <span
                      className="font-semibold text-sm"
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        color: "var(--text-primary)",
                      }}
                    >
                      {formatUsd(item.realizedProfitUsdCents)}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: "var(--accent-gradient)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {metrics.realizedProfitByCompany.length === 0 && (
              <p className="py-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                No realized profit yet.
              </p>
            )}
          </div>
        </GlassPanel>

        <GlassPanel title="Profit by employee" gradient>
          <div className="space-y-3">
            {metrics.realizedProfitByEmployee.map((item) => {
              const pct = Math.round(
                (Math.abs(item.realizedProfitUsdCents) / maxEmployeeProfit) * 100,
              );
              return (
                <div key={item.employeeId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                      {item.employeeName}
                    </span>
                    <span
                      className="font-semibold text-sm"
                      style={{
                        fontFamily: "var(--font-jetbrains-mono), monospace",
                        color: "var(--text-primary)",
                      }}
                    >
                      {formatUsd(item.realizedProfitUsdCents)}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {metrics.realizedProfitByEmployee.length === 0 && (
              <p className="py-4 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                No realized profit yet.
              </p>
            )}
          </div>
        </GlassPanel>
      </section>
    </Shell>
  );
}
