import Link from "next/link";

import { Shell } from "../_components/shell";
import { listCompanies, listInvoices } from "@/src/features/billing/store";
import { formatDate, formatMonthYear, formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const invoices = await listInvoices();
  const companies = await listCompanies();
  const companyMap = new Map(companies.map((company) => [company.id, company.name]));

  return (
    <Shell title="Invoices" eyebrow="Snapshot history">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Invoice register</h2>
            <p className="mt-1 text-sm text-slate-600">Every invoice is a frozen monthly snapshot.</p>
          </div>
          <Link href="/invoices/new" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Create invoice
          </Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Invoice", "Company", "Period", "Billing date", "Status", "Total"].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-semibold text-slate-700">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-4 font-semibold text-slate-900">
                    <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-4">{companyMap.get(invoice.companyId)}</td>
                  <td className="px-4 py-4">{formatMonthYear(invoice.month, invoice.year)}</td>
                  <td className="px-4 py-4">{formatDate(invoice.billingDate)}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
                      {invoice.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold">{formatUsd(invoice.grandTotalUsdCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
