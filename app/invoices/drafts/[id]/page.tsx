import Link from "next/link";
import { notFound } from "next/navigation";

import { Shell } from "../../../_components/shell";
import { GlassPanel } from "../../../_components/glass-panel";
import { inputClass } from "../../../_components/field";
import { PendingActionButton } from "../../../_components/pending-action-button";
import { PendingSubmitButton } from "../../../_components/pending-submit-button";
import { AdjustmentForms } from "./adjustment-forms";
import {
  addInvoiceAdjustmentAction,
  assignInvoiceMemberAction,
  addInvoiceTeamAction,
  deleteInvoiceAdjustmentAction,
  deleteInvoiceLineItemAction,
  deleteInvoiceTeamAction,
  updateInvoiceGrandTotalAction,
  updateInvoiceHeaderAction,
  updateInvoiceLineItemTotalAction,
  updateInvoiceNoteAction,
  updateInvoiceTeamTotalAction,
  updateInvoiceAdjustmentAmountAction,
  updateInvoiceLineItemAction,
  updateInvoiceStatusAction,
} from "@/src/features/billing/actions";
import {
  getInvoiceDetail,
  getCompanySecurityDepositBalances,
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

  const availableTeamNames = await listAvailableTeamNames(detail.company.id);
  const employees = await listEmployees(detail.company.id);
  const securityDepositBalances = await getCompanySecurityDepositBalances(detail.company.id);
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
      <section className="flex min-w-0 flex-col gap-6 xl:flex-row xl:items-start">
        <div
          className="min-w-0 flex-1 space-y-6 overflow-x-auto"
          data-testid="invoice-table-section"
          style={{ scrollBehavior: "smooth" }}
        >
          <GlassPanel gradient>
            <div className="space-y-6">

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
                  <span className={`status-badge status-${detail.invoice.status.replace("_", "-")}`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
                    {detail.invoice.status}
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

              <form action={updateInvoiceHeaderAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                <input type="hidden" name="companyId" value={detail.company.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span>Company name</span>
                  <input
                    name="companyName"
                    defaultValue={detail.company.name}
                    className={inputClass}
                    aria-label="Company name"
                  />
                </label>
                <label className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span>Invoice number</span>
                  <input
                    name="invoiceNumber"
                    defaultValue={detail.invoice.invoiceNumber}
                    className={inputClass}
                    aria-label="Invoice number"
                  />
                </label>
                <label className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span>Billing month</span>
                  <input
                    name="month"
                    type="number"
                    min="1"
                    max="12"
                    defaultValue={detail.invoice.month}
                    className={inputClass}
                    aria-label="Billing month"
                  />
                </label>
                <label className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span>Billing year</span>
                  <input
                    name="year"
                    type="number"
                    min="2000"
                    max="2100"
                    defaultValue={detail.invoice.year}
                    className={inputClass}
                    aria-label="Billing year"
                  />
                </label>
                <label className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span>Billing date</span>
                  <input
                    name="billingDate"
                    type="date"
                    defaultValue={detail.invoice.billingDate}
                    className={inputClass}
                    aria-label="Billing date"
                  />
                </label>
                <label className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span>Due date</span>
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={detail.invoice.dueDate}
                    className={inputClass}
                    aria-label="Due date"
                  />
                </label>
                <label
                  className="space-y-2 text-sm md:col-span-2 xl:col-span-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <span>Status</span>
                  <select
                    name="status"
                    defaultValue={detail.invoice.status}
                    className={inputClass}
                    aria-label="Status"
                  >
                    <option value="draft">draft</option>
                    <option value="generated">generated</option>
                    <option value="sent">sent</option>
                    <option value="cashed_out">cashed_out</option>
                  </select>
                </label>
                <div className="md:col-span-2 xl:col-span-4">
                  <PendingSubmitButton
                    className="gradient-btn"
                    defaultText="Save header"
                    pendingText="Saving..."
                  />
                </div>
              </form>

              <div className="flex flex-wrap gap-3">
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
                {detail.invoice.status === "draft" ? (
                  <form action={updateInvoiceStatusAction}>
                    <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                    <input type="hidden" name="status" value="generated" />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <PendingSubmitButton
                      className="btn-outline"
                      defaultText="Mark generated"
                      pendingText="Marking..."
                    />
                  </form>
                ) : null}
                <form action={updateInvoiceGrandTotalAction} className="flex items-center gap-2">
                  <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input
                    name="grandTotalUsd"
                    type="number"
                    step="1"
                    min="0"
                    defaultValue={Math.round(detail.invoice.grandTotalUsdCents / 100)}
                    className={inputClass}
                    style={{ minWidth: "8rem" }}
                  />
                  <PendingSubmitButton
                    className="btn-outline"
                    defaultText="Update grand total"
                    pendingText="Updating..."
                  />
                </form>
              </div>
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
                      <form action={updateInvoiceTeamTotalAction} className="mt-2 flex items-center gap-2">
                        <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                        <input type="hidden" name="invoiceTeamId" value={team.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <input
                          name="teamTotalUsd"
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={Math.round((team.totalUsdCents ?? 0) / 100)}
                          className={inputClass}
                          style={{ minWidth: "8rem" }}
                        />
                        <PendingSubmitButton
                          className="btn-outline"
                          defaultText="Update team total"
                          pendingText="Updating..."
                        />
                      </form>
                    </div>
                    <form action={deleteInvoiceTeamAction}>
                      <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                      <input type="hidden" name="invoiceTeamId" value={team.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <PendingSubmitButton
                        className="btn-outline"
                        defaultText="Remove team"
                        pendingText="Removing..."
                      />
                    </form>
                  </div>

                  <div
                    className="mt-4 overflow-x-auto rounded-2xl"
                    style={{ border: "1px solid var(--glass-border)", scrollBehavior: "smooth" }}
                  >
                    <table className="glass-table min-w-[1200px]" style={{ tableLayout: "auto" }}>
                      <thead>
                        <tr>
                          {[
                            "Candidate",
                            "Designation",
                            "Rate ($/hr)",
                            "Hrs per week",
                            "Days worked",
                            "Total",
                            "Actions",
                          ].map((heading) => (
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
                                name="hrsPerWeek"
                                type="number"
                                step="0.01"
                                min="0"
                                defaultValue={lineItem.hrsPerWeek}
                                className={inputClass}
                                style={{ minWidth: "6rem" }}
                              />
                            </td>
                            <td>
                              <input
                                form={`line-item-${lineItem.id}`}
                                name="daysWorked"
                                type="number"
                                step="1"
                                min="1"
                                defaultValue={lineItem.daysWorked}
                                className={inputClass}
                                style={{ minWidth: "6rem" }}
                              />
                            </td>
                            <td style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                              <form action={updateInvoiceLineItemTotalAction} className="flex items-center gap-2">
                                <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                                <input type="hidden" name="lineItemId" value={lineItem.id} />
                                <input type="hidden" name="returnTo" value={returnTo} />
                                <input
                                  name="billedTotalUsd"
                                  type="number"
                                  min="0"
                                  step="1"
                                  defaultValue={Math.round(lineItem.billedTotalUsdCents / 100)}
                                  className={inputClass}
                                  style={{ minWidth: "8rem" }}
                                />
                                <PendingSubmitButton
                                  className="btn-outline"
                                  defaultText="Update total"
                                  pendingText="Updating..."
                                />
                              </form>
                            </td>
                            <td>
                              <div className="flex flex-wrap gap-2">
                                <PendingActionButton
                                  form={`line-item-${lineItem.id}`}
                                  className="btn-outline"
                                  defaultText="Update"
                                  pendingText="Updating..."
                                />
                                <form action={deleteInvoiceLineItemAction}>
                                  <input type="hidden" name="invoiceId" value={detail.invoice.id} />
                                  <input type="hidden" name="lineItemId" value={lineItem.id} />
                                  <input type="hidden" name="returnTo" value={returnTo} />
                                  <PendingSubmitButton
                                    className="btn-outline"
                                    defaultText="Remove member"
                                    pendingText="Removing..."
                                  />
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
                          <PendingSubmitButton
                            className="gradient-btn"
                            disabled={eligibleEmployees.length === 0}
                            style={eligibleEmployees.length === 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                            defaultText={`Add member to ${team.teamName}`}
                            pendingText="Adding member..."
                          />
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

        <aside
          className="min-w-0 space-y-6 xl:sticky xl:top-4 xl:h-[calc(100vh-2rem)] xl:w-[340px] xl:min-w-[340px] xl:flex-none xl:overflow-y-auto xl:border-l xl:pl-4"
          data-testid="invoice-sidebar-section"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        >
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
              <PendingSubmitButton
                className="gradient-btn w-full"
                disabled={remainingTeamNames.length === 0}
                style={remainingTeamNames.length === 0 ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
                defaultText="Add selected team"
                pendingText="Adding team..."
              />
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
              <PendingSubmitButton
                className="gradient-btn w-full"
                defaultText="Create team and add to invoice"
                pendingText="Creating team..."
              />
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
                employees={employees.map((employee) => ({
                  id: employee.id,
                  fullName: employee.fullName,
                  billingRateUsdCents: employee.billingRateUsdCents,
                  hrsPerWeek: employee.hrsPerWeek,
                }))}
                securityDepositBalances={securityDepositBalances}
                adjustments={detail.adjustments}
                addAction={addInvoiceAdjustmentAction}
                deleteAction={deleteInvoiceAdjustmentAction}
                updateAmountAction={updateInvoiceAdjustmentAmountAction}
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
              <PendingSubmitButton
                className="btn-outline w-full"
                defaultText="Save note"
                pendingText="Saving note..."
              />
            </form>
          </GlassPanel>
        </aside>
      </section>
    </Shell>
  );
}
