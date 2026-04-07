import { Shell } from "../_components/shell";
import { getDashboardMetrics } from "@/src/features/billing/store";
import { formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <Shell title="Dashboard" eyebrow="Realized profit only">
      <section className="grid gap-4 lg:grid-cols-4">
        <Card label="Draft invoices" value={String(metrics.invoiceStatusCounts.draft)} />
        <Card label="Generated invoices" value={String(metrics.invoiceStatusCounts.generated)} />
        <Card label="Sent invoices" value={String(metrics.invoiceStatusCounts.sent)} />
        <Card label="Realized profit" value={formatUsd(metrics.realizedProfitUsdCents)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-semibold">Profit by company</h2>
          <div className="mt-4 space-y-3">
            {metrics.realizedProfitByCompany.map((item) => (
              <div key={item.companyId} className="flex items-center justify-between rounded-3xl border border-slate-200 px-4 py-3">
                <span className="font-medium">{item.companyName}</span>
                <span className="font-semibold">{formatUsd(item.realizedProfitUsdCents)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-semibold">Profit by employee</h2>
          <div className="mt-4 space-y-3">
            {metrics.realizedProfitByEmployee.map((item) => (
              <div key={item.employeeId} className="flex items-center justify-between rounded-3xl border border-slate-200 px-4 py-3">
                <span className="font-medium">{item.employeeName}</span>
                <span className="font-semibold">{formatUsd(item.realizedProfitUsdCents)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}
