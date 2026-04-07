import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Shell } from "../../../_components/shell";
import { GlassPanel } from "../../../_components/glass-panel";
import { inputClass } from "../../../_components/field";
import {
  addInvoiceAdjustmentAction,
  addInvoiceTeamAction,
  deleteInvoiceLineItemAction,
  deleteInvoiceTeamAction,
  updateInvoiceNoteAction,
  updateInvoiceLineItemAction,
  updateInvoiceStatusAction,
} from "@/src/features/billing/actions";
import {
  getInvoiceDetail,
  listAvailableTeamNames,
} from "@/src/features/billing/store";
import { formatDate, formatMonthYear, formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

export default async function DraftInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getInvoiceDetail(id);

  if (!detail) {
    notFound();
  }

  if (detail.invoice.status !== "draft") {
    redirect("/invoices");
  }

  const availableTeamNames = await listAvailableTeamNames(detail.company.id);
  const selectedTeamNames = new Set(detail.teams.map((team) => team.teamName.toLowerCase()));
  const remainingTeamNames = availableTeamNames.filter(
    (teamName) => !selectedTeamNames.has(teamName.toLowerCase()),
  );

  return (
    <Shell title={detail.invoice.invoiceNumber} eyebrow="Draft editor">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
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
                <span className="status-badge status-draft">
                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
                  draft
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
            </div>
          </GlassPanel>

          <GlassPanel>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] gradient-text">
                  Invoice teams
                </p>
                <h3 className="mt-1 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                  {detail.teams.length > 0 ? `${detail.teams.length} teams selected` : "No teams selected"}
                </h3>
              </div>
            </div>

            <div className="space-y-6">
              {detail.teams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                        {team.teamName}
                      </h4>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {team.lineItems.length} members in this invoice snapshot
                      </p>
                    </div>
                    <form action={deleteInvoiceTeamAction}>
                      <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                      <input type="hidden" name="invoiceTeamId" value={team.id} />
                      <button type="submit" className="btn-outline">
                        Remove team
                      </button>
                    </form>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--glass-border)" }}>
                    <table className="glass-table">
                      <thead>
                        <tr>
                          {["Candidate", "Designation", "Rate", "Hours", "Total", "Actions"].map((heading) => (
                            <th key={heading}>{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {team.lineItems.map((lineItem) => (
                          <tr key={lineItem.id}>
                            <td className="font-semibold">{lineItem.employeeNameSnapshot}</td>
                            <td>{lineItem.designationSnapshot}</td>
                            <td>
                              <form action={updateInvoiceLineItemAction} className="flex flex-wrap items-center gap-2">
                                <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                                <input type="hidden" name="lineItemId" value={lineItem.id} />
                                <input
                                  name="billingRateUsd"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  defaultValue={(lineItem.billingRateUsdCents / 100).toFixed(2)}
                                  className={inputClass}
                                  style={{ minWidth: "7rem" }}
                                />
                                <input
                                  name="hoursBilled"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  defaultValue={lineItem.hoursBilled}
                                  className={inputClass}
                                  style={{ minWidth: "6rem" }}
                                />
                                <button type="submit" className="btn-outline">
                                  Update
                                </button>
                              </form>
                            </td>
                            <td style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                              {lineItem.hoursBilled}
                            </td>
                            <td style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                              {formatUsd(lineItem.billedTotalUsdCents)}
                            </td>
                            <td>
                              <form action={deleteInvoiceLineItemAction}>
                                <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                                <input type="hidden" name="lineItemId" value={lineItem.id} />
                                <button type="submit" className="btn-outline">
                                  Remove member
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                        {team.lineItems.length === 0 && (
                          <tr>
                            <td colSpan={6} className="text-center py-6" style={{ color: "var(--text-muted)" }}>
                              No matching members were imported for this team.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {detail.teams.length === 0 && (
                <div
                  className="rounded-2xl p-6 text-sm"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-muted)",
                  }}
                >
                  Add one or more teams from the catalog to start building the invoice.
                </div>
              )}
            </div>
          </GlassPanel>

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

        <div className="space-y-6">
          <GlassPanel gradient>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Add existing team
            </h3>
            <form action={addInvoiceTeamAction} className="mt-4 space-y-3">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <input type="hidden" name="companyId" value={detail.company.id} />
              <select
                name="selectedTeamName"
                className={inputClass}
                disabled={remainingTeamNames.length === 0}
                defaultValue={remainingTeamNames[0] ?? ""}
              >
                {remainingTeamNames.length === 0 ? (
                  <option value="">All available teams are already on this invoice</option>
                ) : (
                  remainingTeamNames.map((teamName) => (
                    <option key={teamName} value={teamName}>
                      {teamName}
                    </option>
                  ))
                )}
              </select>
              <button
                type="submit"
                className="gradient-btn w-full"
                disabled={remainingTeamNames.length === 0}
                style={remainingTeamNames.length === 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              >
                Add selected team
              </button>
            </form>
          </GlassPanel>

          <GlassPanel gradient>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Create new team
            </h3>
            <form action={addInvoiceTeamAction} className="mt-4 space-y-3">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <input type="hidden" name="companyId" value={detail.company.id} />
              <input name="newTeamName" required placeholder="Operations" className={inputClass} />
              <button type="submit" className="gradient-btn w-full">
                Create team and add to invoice
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
              <textarea name="noteText" defaultValue={detail.invoice.noteText} rows={5} className={inputClass} />
              <button type="submit" className="btn-outline w-full">
                Save note
              </button>
            </form>
          </GlassPanel>
        </div>
      </section>
    </Shell>
  );
}
