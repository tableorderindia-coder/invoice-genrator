import Link from "next/link";
import { notFound } from "next/navigation";

import { Shell } from "../../_components/shell";
import { GlassPanel } from "../../_components/glass-panel";
import { Field, inputClass } from "../../_components/field";
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

function getStatusClass(status: string) {
  return `status-badge status-${status.replace("_", "-")}`;
}

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
        {/* Left column — invoice data */}
        <div className="space-y-6">
          {/* Invoice header */}
          <GlassPanel gradient>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] gradient-text">
                  {detail.company.name}
                </p>
                <h2 className="mt-1 text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
                  {formatMonthYear(detail.invoice.month, detail.invoice.year)}
                </h2>
                <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  Billing {formatDate(detail.invoice.billingDate)} · Due{" "}
                  {formatDate(detail.invoice.dueDate)}
                </p>
              </div>
              <div className="text-right">
                <span className={getStatusClass(detail.invoice.status)}>
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ background: "currentColor" }}
                  />
                  {detail.invoice.status.replace("_", " ")}
                </span>
                <p
                  className="mt-3 text-3xl font-semibold"
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    color: "var(--text-primary)",
                  }}
                >
                  {formatUsd(detail.invoice.grandTotalUsdCents)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/api/invoices/${detail.invoice.id}/pdf`}
                className="btn-outline flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Open PDF
              </Link>
              <form action={updateInvoiceStatusAction}>
                <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                <input type="hidden" name="status" value="generated" />
                <button type="submit" className="gradient-btn">
                  Mark generated
                </button>
              </form>
              <form action={updateInvoiceStatusAction}>
                <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                <input type="hidden" name="status" value="sent" />
                <button type="submit" className="btn-outline">
                  Mark sent
                </button>
              </form>
            </div>
          </GlassPanel>

          {/* Team tables */}
          <div className="space-y-4">
            {detail.teams.map((team) => (
              <GlassPanel key={team.id}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                    {team.teamName}
                  </h3>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: "rgba(99,102,241,0.1)",
                      color: "var(--text-accent)",
                      border: "1px solid rgba(99,102,241,0.15)",
                    }}
                  >
                    {team.lineItems.length} candidates
                  </span>
                </div>
                <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--glass-border)" }}>
                  <table className="glass-table">
                    <thead>
                      <tr>
                        {["Candidate", "Designation", "Rate", "Hours", "Total", "Profit"].map((heading) => (
                          <th key={heading}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {team.lineItems.map((lineItem) => (
                        <tr key={lineItem.id}>
                          <td className="font-semibold">{lineItem.employeeNameSnapshot}</td>
                          <td>{lineItem.designationSnapshot}</td>
                          <td style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                            {formatUsd(lineItem.billingRateUsdCents)}
                          </td>
                          <td style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                            {lineItem.hoursBilled}
                          </td>
                          <td style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                            {formatUsd(lineItem.billedTotalUsdCents)}
                          </td>
                          <td
                            className="font-semibold"
                            style={{
                              fontFamily: "var(--font-jetbrains-mono), monospace",
                              color: "#34d399",
                            }}
                          >
                            {formatUsd(lineItem.profitTotalUsdCents)}
                          </td>
                        </tr>
                      ))}
                      {team.lineItems.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-6" style={{ color: "var(--text-muted)" }}>
                            No candidates in this team yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassPanel>
            ))}
          </div>

          {/* Adjustments */}
          <GlassPanel>
            <h3 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Adjustments
            </h3>
            <div className="mt-4 space-y-3">
              {detail.adjustments.map((adjustment) => (
                <div
                  key={adjustment.id}
                  className="flex items-center justify-between rounded-2xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div>
                    <p className="font-medium" style={{ color: "var(--text-primary)" }}>
                      {adjustment.label}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {adjustment.type}
                      {adjustment.employeeName ? ` · ${adjustment.employeeName}` : ""}
                    </p>
                  </div>
                  <p
                    className="font-semibold"
                    style={{
                      fontFamily: "var(--font-jetbrains-mono), monospace",
                      color: adjustment.amountUsdCents < 0 ? "#f87171" : "var(--text-primary)",
                    }}
                  >
                    {formatUsd(adjustment.amountUsdCents)}
                  </p>
                </div>
              ))}
              {detail.adjustments.length === 0 && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No adjustments added yet.
                </p>
              )}
            </div>
          </GlassPanel>
        </div>

        {/* Right column — action panels */}
        <div className="space-y-6">
          <GlassPanel gradient>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Add team section
            </h3>
            <form action={addInvoiceTeamAction} className="mt-4 space-y-3">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <input
                name="teamName"
                required
                placeholder="Data Engineering"
                className={inputClass}
              />
              <button type="submit" className="gradient-btn w-full">
                Add team
              </button>
            </form>
          </GlassPanel>

          <GlassPanel gradient>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Add candidate
            </h3>
            <form action={addInvoiceLineItemAction} className="mt-4 space-y-3">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <select name="invoiceTeamId" required className={inputClass}>
                {detail.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.teamName}
                  </option>
                ))}
              </select>
              <select name="employeeId" required className={inputClass}>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} · {employee.defaultTeam}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-3">
                <input name="hoursBilled" type="number" step="0.01" min="0" required placeholder="Hours" className={inputClass} />
                <input name="billingRateUsd" type="number" step="0.01" min="0" placeholder="Bill $/hr" className={inputClass} />
                <input name="payoutRateUsd" type="number" step="0.01" min="0" placeholder="Payout $/hr" className={inputClass} />
              </div>
              <button type="submit" className="gradient-btn w-full">
                Add candidate
              </button>
            </form>
          </GlassPanel>

          <GlassPanel gradient>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Add adjustment
            </h3>
            <form action={addInvoiceAdjustmentAction} className="mt-4 space-y-3">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <select name="type" className={inputClass}>
                <option value="onboarding">Onboarding</option>
                <option value="offboarding">Offboarding deduction</option>
                <option value="reimbursement">Reimbursement</option>
              </select>
              <input name="label" required placeholder="Label" className={inputClass} />
              <input name="employeeName" placeholder="Employee (optional)" className={inputClass} />
              <input name="amountUsd" required type="number" step="0.01" min="0" placeholder="Amount in USD" className={inputClass} />
              <button type="submit" className="gradient-btn w-full">
                Add adjustment
              </button>
            </form>
          </GlassPanel>

          <GlassPanel>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Invoice note
            </h3>
            <form action={updateInvoiceNoteAction} className="mt-4 space-y-3">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <textarea
                name="noteText"
                defaultValue={detail.invoice.noteText}
                rows={5}
                className={inputClass}
              />
              <button type="submit" className="btn-outline w-full">
                Save note
              </button>
            </form>
          </GlassPanel>

          <GlassPanel gradient>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Cash out
            </h3>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Realized profit is only counted after cash out.
            </p>
            <div className="mt-4">
              {detail.realization ? (
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.2)",
                  }}
                >
                  <p className="font-semibold text-sm" style={{ color: "#34d399" }}>
                    ✓ Cashed out on {formatDate(detail.realization.realizedAt)}
                  </p>
                  <div
                    className="mt-2 text-sm space-y-1"
                    style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
                  >
                    <p style={{ color: "var(--text-secondary)" }}>
                      Revenue {formatUsd(detail.realization.realizedRevenueUsdCents)}
                    </p>
                    <p style={{ color: "var(--text-secondary)" }}>
                      Payout {formatUsd(detail.realization.realizedPayoutUsdCents)}
                    </p>
                    <p style={{ color: "#34d399" }}>
                      Profit {formatUsd(detail.realization.realizedProfitUsdCents)}
                    </p>
                  </div>
                </div>
              ) : (
                <form action={cashOutInvoiceAction} className="space-y-3">
                  <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                  <input name="realizedAt" type="date" required className={inputClass} />
                  <button
                    type="submit"
                    className="w-full rounded-full px-4 py-3 text-sm font-semibold text-white cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #059669, #10b981)",
                      boxShadow: "0 4px 20px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    Cash out invoice
                  </button>
                </form>
              )}
            </div>
          </GlassPanel>
        </div>
      </section>
    </Shell>
  );
}
