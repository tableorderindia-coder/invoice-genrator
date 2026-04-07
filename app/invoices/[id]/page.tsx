import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Shell } from "../../_components/shell";
import {
  addInvoiceAdjustmentAction,
  addInvoiceLineItemAction,
  addInvoiceTeamAction,
  cashOutInvoiceAction,
  updateInvoiceNoteAction,
  updateInvoiceStatusAction,
} from "@/src/features/billing/actions";
import {
  getInvoiceDetail,
  listEmployees,
} from "@/src/features/billing/store";
import { formatDate, formatMonthYear, formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getInvoiceDetail(id);

  if (!detail) {
    notFound();
  }

  const employees = await listEmployees(detail.company.id);

  return (
    <Shell title={detail.invoice.invoiceNumber} eyebrow="Invoice detail">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-amber-700">{detail.company.name}</p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {formatMonthYear(detail.invoice.month, detail.invoice.year)}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Billing {formatDate(detail.invoice.billingDate)} · Due{" "}
                  {formatDate(detail.invoice.dueDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700">
                  {detail.invoice.status.replace("_", " ")}
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  {formatUsd(detail.invoice.grandTotalUsdCents)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/api/invoices/${detail.invoice.id}/pdf`}
                className="rounded-full border border-slate-900 px-4 py-2 text-sm font-semibold text-slate-900"
              >
                Open PDF
              </Link>
              <form action={updateInvoiceStatusAction}>
                <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                <input type="hidden" name="status" value="generated" />
                <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  Mark generated
                </button>
              </form>
              <form action={updateInvoiceStatusAction}>
                <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                <input type="hidden" name="status" value="sent" />
                <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900">
                  Mark sent
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-4">
            {detail.teams.map((team) => (
              <div key={team.id} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{team.teamName}</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-700">
                    {team.lineItems.length} candidates
                  </span>
                </div>
                <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {["Candidate", "Designation", "Rate", "Hours", "Total", "Profit"].map((heading) => (
                          <th key={heading} className="px-4 py-3 font-semibold text-slate-700">
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {team.lineItems.map((lineItem) => (
                        <tr key={lineItem.id}>
                          <td className="px-4 py-4 font-semibold">{lineItem.employeeNameSnapshot}</td>
                          <td className="px-4 py-4">{lineItem.designationSnapshot}</td>
                          <td className="px-4 py-4">{formatUsd(lineItem.billingRateUsdCents)}</td>
                          <td className="px-4 py-4">{lineItem.hoursBilled}</td>
                          <td className="px-4 py-4">{formatUsd(lineItem.billedTotalUsdCents)}</td>
                          <td className="px-4 py-4">{formatUsd(lineItem.profitTotalUsdCents)}</td>
                        </tr>
                      ))}
                      {team.lineItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                            No candidates in this team yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
            <h3 className="text-xl font-semibold">Adjustments</h3>
            <div className="mt-4 space-y-3">
              {detail.adjustments.map((adjustment) => (
                <div key={adjustment.id} className="flex items-center justify-between rounded-3xl border border-slate-200 px-4 py-3">
                  <div>
                    <p className="font-medium">{adjustment.label}</p>
                    <p className="text-sm text-slate-500">
                      {adjustment.type}
                      {adjustment.employeeName ? ` · ${adjustment.employeeName}` : ""}
                    </p>
                  </div>
                  <p className="font-semibold">{formatUsd(adjustment.amountUsdCents)}</p>
                </div>
              ))}
              {detail.adjustments.length === 0 ? (
                <p className="text-sm text-slate-500">No adjustments added yet.</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Panel title="Add team section">
            <form action={addInvoiceTeamAction} className="space-y-3">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <input name="teamName" required placeholder="Data Engineering" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              <button className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                Add team
              </button>
            </form>
          </Panel>

          <Panel title="Add candidate">
            <form action={addInvoiceLineItemAction} className="space-y-3">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <select name="invoiceTeamId" required className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                {detail.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.teamName}
                  </option>
                ))}
              </select>
              <select name="employeeId" required className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} · {employee.defaultTeam}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-3">
                <input name="hoursBilled" type="number" step="0.01" min="0" required placeholder="Hours" className="rounded-2xl border border-slate-200 px-4 py-3" />
                <input name="billingRateUsd" type="number" step="0.01" min="0" placeholder="Bill USD/hr" className="rounded-2xl border border-slate-200 px-4 py-3" />
                <input name="payoutRateUsd" type="number" step="0.01" min="0" placeholder="Payout USD/hr" className="rounded-2xl border border-slate-200 px-4 py-3" />
              </div>
              <button className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                Add candidate
              </button>
            </form>
          </Panel>

          <Panel title="Add adjustment">
            <form action={addInvoiceAdjustmentAction} className="space-y-3">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <select name="type" className="w-full rounded-2xl border border-slate-200 px-4 py-3">
                <option value="onboarding">Onboarding</option>
                <option value="offboarding">Offboarding deduction</option>
                <option value="reimbursement">Reimbursement</option>
              </select>
              <input name="label" required placeholder="Label" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              <input name="employeeName" placeholder="Employee (optional)" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              <input name="amountUsd" required type="number" step="0.01" min="0" placeholder="Amount in USD" className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
              <button className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                Add adjustment
              </button>
            </form>
          </Panel>

          <Panel title="Invoice note">
            <form action={updateInvoiceNoteAction} className="space-y-3">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <textarea
                name="noteText"
                defaultValue={detail.invoice.noteText}
                rows={5}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3"
              />
              <button className="w-full rounded-full border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900">
                Save note
              </button>
            </form>
          </Panel>

          <Panel title="Cash out">
            <p className="mb-3 text-sm text-slate-600">
              Realized profit is only counted after cash out.
            </p>
            {detail.realization ? (
              <div className="rounded-3xl bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">
                  Cashed out on {formatDate(detail.realization.realizedAt)}
                </p>
                <p className="mt-2">
                  Revenue {formatUsd(detail.realization.realizedRevenueUsdCents)} · Payout{" "}
                  {formatUsd(detail.realization.realizedPayoutUsdCents)} · Profit{" "}
                  {formatUsd(detail.realization.realizedProfitUsdCents)}
                </p>
              </div>
            ) : (
              <form action={cashOutInvoiceAction} className="space-y-3">
                <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                <input name="realizedAt" type="date" required className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
                <button className="w-full rounded-full bg-emerald-700 px-4 py-3 text-sm font-semibold text-white">
                  Cash out invoice
                </button>
              </form>
            )}
          </Panel>
        </div>
      </section>
    </Shell>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}
