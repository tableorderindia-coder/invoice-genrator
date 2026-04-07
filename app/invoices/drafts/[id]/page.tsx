import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Shell } from "../../../_components/shell";
import { GlassPanel } from "../../../_components/glass-panel";
import { inputClass } from "../../../_components/field";
import {
  addInvoiceAdjustmentAction,
  addInvoiceLineItemAction,
  addInvoiceTeamAction,
  deleteInvoiceTeamAction,
  updateInvoiceNoteAction,
  updateInvoiceStatusAction,
} from "@/src/features/billing/actions";
import { resolveSelectedTeam } from "@/src/features/billing/invoice-editor";
import { getInvoiceDetail, listEmployees } from "@/src/features/billing/store";
import { formatDate, formatMonthYear, formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

export default async function DraftInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ teamId?: string | string[] }>;
}) {
  const { id } = await params;
  const { teamId } = await searchParams;
  const detail = await getInvoiceDetail(id);

  if (!detail) {
    notFound();
  }

  if (detail.invoice.status !== "draft") {
    redirect("/invoices");
  }

  const employees = await listEmployees(detail.company.id);
  const selectedTeam = resolveSelectedTeam(
    detail.teams,
    Array.isArray(teamId) ? teamId[0] : teamId,
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
                  Team workspace
                </p>
                <h3 className="mt-1 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                  {selectedTeam ? selectedTeam.teamName : "No team selected"}
                </h3>
              </div>
              {selectedTeam ? (
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: "rgba(99,102,241,0.1)",
                    color: "var(--text-accent)",
                    border: "1px solid rgba(99,102,241,0.15)",
                  }}
                >
                  {selectedTeam.lineItems.length} candidates
                </span>
              ) : null}
            </div>
            {selectedTeam ? (
              <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--glass-border)" }}>
                <table className="glass-table">
                  <thead>
                    <tr>
                      {["Candidate", "Designation", "Rate", "Hours", "Total"].map((heading) => (
                        <th key={heading}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTeam.lineItems.map((lineItem) => (
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
                      </tr>
                    ))}
                    {selectedTeam.lineItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6" style={{ color: "var(--text-muted)" }}>
                          No candidates in this team yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                className="rounded-2xl p-6 text-sm"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-muted)",
                }}
              >
                Create a team and select it to start adding candidates.
              </div>
            )}
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
              Team manager
            </h3>
            <form action={addInvoiceTeamAction} className="mt-4 space-y-3">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <input name="teamName" required placeholder="Data Engineering" className={inputClass} />
              <button type="submit" className="gradient-btn w-full">
                Add team
              </button>
            </form>
            <div className="mt-4 space-y-3">
              {detail.teams.map((team) => {
                const isSelected = selectedTeam?.id === team.id;
                return (
                  <Link
                    key={team.id}
                    href={`/invoices/drafts/${detail.invoice.id}?teamId=${team.id}`}
                    className="block rounded-2xl p-4 transition"
                    style={{
                      background: isSelected
                        ? "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(14,165,233,0.12))"
                        : "rgba(255,255,255,0.03)",
                      border: isSelected
                        ? "1px solid rgba(99,102,241,0.35)"
                        : "1px solid var(--glass-border)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                          {team.teamName}
                        </p>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                          {team.lineItems.length} candidates
                        </p>
                      </div>
                      {isSelected ? (
                        <span className="text-xs font-semibold" style={{ color: "var(--text-accent)" }}>
                          Selected
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
              {detail.teams.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  No teams yet. Add one to start the invoice workspace.
                </p>
              ) : null}
            </div>
            <form action={deleteInvoiceTeamAction} className="mt-4">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <input type="hidden" name="invoiceTeamId" value={selectedTeam?.id ?? ""} />
              <button
                type="submit"
                disabled={!selectedTeam}
                className="btn-outline w-full"
                style={!selectedTeam ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              >
                Remove selected team
              </button>
            </form>
          </GlassPanel>

          <GlassPanel gradient>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {selectedTeam ? `Add candidate to ${selectedTeam.teamName}` : "Add candidate"}
            </h3>
            <form action={addInvoiceLineItemAction} className="mt-4 space-y-3">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <input type="hidden" name="invoiceTeamId" value={selectedTeam?.id ?? ""} />
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {selectedTeam
                  ? `Selected team: ${selectedTeam.teamName}`
                  : "Create and select a team before adding candidates."}
              </p>
              <select name="employeeId" required disabled={!selectedTeam} className={inputClass}>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName} · {employee.defaultTeam}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-3">
                <input name="hoursBilled" type="number" step="0.01" min="0" required disabled={!selectedTeam} placeholder="Hours" className={inputClass} />
                <input name="billingRateUsd" type="number" step="0.01" min="0" disabled={!selectedTeam} placeholder="Bill $/hr" className={inputClass} />
                <input name="payoutRateUsd" type="number" step="0.01" min="0" disabled={!selectedTeam} placeholder="Payout $/hr" className={inputClass} />
              </div>
              <button
                type="submit"
                disabled={!selectedTeam}
                className="gradient-btn w-full"
                style={!selectedTeam ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
              >
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
