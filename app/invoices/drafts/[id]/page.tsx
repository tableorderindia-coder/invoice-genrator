import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Shell } from "../../../_components/shell";
import { GlassPanel } from "../../../_components/glass-panel";
import { inputClass } from "../../../_components/field";
import { AdjustmentForms } from "./adjustment-forms";
import {
  addInvoiceAdjustmentAction,
  assignInvoiceMemberAction,
  addInvoiceTeamAction,
  deleteInvoiceAdjustmentAction,
  deleteInvoiceLineItemAction,
  deleteInvoiceTeamAction,
  updateInvoiceNoteAction,
  updateInvoiceLineItemAction,
  updateInvoiceStatusAction,
} from "@/src/features/billing/actions";
import {
  getInvoiceDetail,
  listEmployees,
  listAvailableTeamNames,
} from "@/src/features/billing/store";
import { filterEligibleEmployeesForTeam } from "@/src/features/billing/member-assignment";
import { formatDate, formatMonthYear, formatUsd } from "@/src/features/billing/utils";

export const dynamic = "force-dynamic";

export default async function DraftInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    flashStatus?: string | string[];
    flashMessage?: string | string[];
  }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const detail = await getInvoiceDetail(id);

  if (!detail) {
    notFound();
  }

  if (detail.invoice.status !== "draft") {
    redirect("/invoices");
  }

  const availableTeamNames = await listAvailableTeamNames(detail.company.id);
  const employees = await listEmployees(detail.company.id);
  const selectedTeamNames = new Set(detail.teams.map((team) => team.teamName.toLowerCase()));
  const remainingTeamNames = availableTeamNames.filter(
    (teamName) => !selectedTeamNames.has(teamName.toLowerCase()),
  );
  const flashStatus = Array.isArray(resolvedSearchParams.flashStatus)
    ? resolvedSearchParams.flashStatus[0]
    : resolvedSearchParams.flashStatus;
  const flashMessage = Array.isArray(resolvedSearchParams.flashMessage)
    ? resolvedSearchParams.flashMessage[0]
    : resolvedSearchParams.flashMessage;
  const returnTo = `/invoices/drafts/${detail.invoice.id}`;

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
                <input type="hidden" name="returnTo" value={returnTo} />
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

            {flashMessage ? (
              <div
                className="mb-4 rounded-2xl px-4 py-3 text-sm font-medium"
                style={{
                  background:
                    flashStatus === "error"
                      ? "rgba(248, 113, 113, 0.08)"
                      : "rgba(16, 185, 129, 0.08)",
                  border:
                    flashStatus === "error"
                      ? "1px solid rgba(248, 113, 113, 0.25)"
                      : "1px solid rgba(16, 185, 129, 0.25)",
                  color: flashStatus === "error" ? "#fca5a5" : "#6ee7b7",
                }}
              >
                {flashMessage}
              </div>
            ) : null}

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
                      <input type="hidden" name="returnTo" value={returnTo} />
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
                              <form id={`line-item-${lineItem.id}`} action={updateInvoiceLineItemAction}></form>
                              <input type="hidden" form={`line-item-${lineItem.id}`} name="invoiceId" value={detail.invoice.id} />
                              <input type="hidden" form={`line-item-${lineItem.id}`} name="lineItemId" value={lineItem.id} />
                              <input type="hidden" form={`line-item-${lineItem.id}`} name="returnTo" value={returnTo} />
                              <input
                                form={`line-item-${lineItem.id}`}
                                name="billingRateUsd"
                                type="number"
                                step="0.01"
                                min="0"
                                defaultValue={(lineItem.billingRateUsdCents / 100).toFixed(2)}
                                className={inputClass}
                                style={{ minWidth: "7rem" }}
                              />
                            </td>
                            <td>
                              <input
                                form={`line-item-${lineItem.id}`}
                                name="hoursBilled"
                                type="number"
                                step="0.01"
                                min="0"
                                defaultValue={lineItem.hoursBilled}
                                className={inputClass}
                                style={{ minWidth: "6rem" }}
                              />
                            </td>
                            <td style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                              {formatUsd(lineItem.billedTotalUsdCents)}
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-2">
                                <button type="submit" form={`line-item-${lineItem.id}`} className="btn-outline">
                                  Update
                                </button>
                                <form action={deleteInvoiceLineItemAction}>
                                  <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                                  <input type="hidden" name="lineItemId" value={lineItem.id} />
                                  <input type="hidden" name="returnTo" value={returnTo} />
                                  <button type="submit" className="btn-outline">
                                    Remove member
                                  </button>
                                </form>
                              </div>
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

                  <div className="mt-4">
                    {(() => {
                      const eligibleEmployees = filterEligibleEmployeesForTeam({
                        employees,
                        currentTeamMemberIds: team.lineItems.map((lineItem) => lineItem.employeeId),
                      });

                      return (
                        <form action={assignInvoiceMemberAction} className="flex flex-wrap items-center gap-3">
                          <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                          <input type="hidden" name="invoiceTeamId" value={team.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <select
                            name="employeeId"
                            className={inputClass}
                            disabled={eligibleEmployees.length === 0}
                            defaultValue={eligibleEmployees[0]?.id ?? ""}
                            style={{ minWidth: "16rem" }}
                          >
                            {eligibleEmployees.length === 0 ? (
                              <option value="">All company members are already in this team</option>
                            ) : (
                              eligibleEmployees.map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                  {employee.fullName} · {employee.defaultTeam}
                                </option>
                              ))
                            )}
                          </select>
                          <button
                            type="submit"
                            className="gradient-btn"
                            disabled={eligibleEmployees.length === 0}
                            style={eligibleEmployees.length === 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                          >
                            Add member to {team.teamName}
                          </button>
                        </form>
                      );
                    })()}
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

        </div>

        <div className="space-y-6">
          <GlassPanel gradient>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Add existing team
            </h3>
            <form action={addInvoiceTeamAction} className="mt-4 space-y-3">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <input type="hidden" name="companyId" value={detail.company.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
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
              <input type="hidden" name="returnTo" value={returnTo} />
              <input name="newTeamName" required placeholder="Operations" className={inputClass} />
              <button type="submit" className="gradient-btn w-full">
                Create team and add to invoice
              </button>
            </form>
          </GlassPanel>

          <GlassPanel gradient>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Add adjustments
            </h3>
            <div className="mt-4">
              <AdjustmentForms
                invoiceId={detail.invoice.id}
                returnTo={returnTo}
                adjustments={detail.adjustments}
                addAction={addInvoiceAdjustmentAction}
                deleteAction={deleteInvoiceAdjustmentAction}
              />
            </div>
          </GlassPanel>

          <GlassPanel>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Invoice note
            </h3>
            <form action={updateInvoiceNoteAction} className="mt-4 space-y-3">
              <input type="hidden" name="invoiceId" value={detail.invoice.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
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
