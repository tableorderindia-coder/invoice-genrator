import { GlassPanel } from "../_components/glass-panel";
import { inputClass } from "../_components/field";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { Shell } from "../_components/shell";
import {
  getInvoicePaymentPrefillData,
  listCashFlowInvoiceOptions,
} from "@/src/features/billing/employee-cash-flow-store";
import {
  buildEmployeeCashFlowInvoiceOptionsInput,
  resolveEmployeeCashFlowMonthKey,
} from "@/src/features/billing/employee-cash-flow-page-state";
import { listCompanies } from "@/src/features/billing/store";
import {
  aggregateEmployeeCashFlowEditableEntries,
  type EmployeeCashFlowEditableEntry,
} from "@/src/features/billing/employee-cash-flow-entry-aggregation";

import EmployeeCashFlowEntryForm from "./_components/employee-cash-flow-entry-form";

export const dynamic = "force-dynamic";

export default async function EmployeeCashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string | string[];
    month?: string | string[];
    year?: string | string[];
    invoiceId?: string | string[];
    flashStatus?: string | string[];
    flashMessage?: string | string[];
  }>;
}) {
  const resolved = await searchParams;
  const companies = await listCompanies();

  const selectedCompanyIdRaw = Array.isArray(resolved.companyId)
    ? resolved.companyId[0]
    : resolved.companyId;
  const selectedCompanyId = selectedCompanyIdRaw || companies[0]?.id || "";

  const monthKey = resolveEmployeeCashFlowMonthKey(resolved.month, resolved.year);

  const invoiceOptionsInput = buildEmployeeCashFlowInvoiceOptionsInput(selectedCompanyId);
  const invoiceOptions = invoiceOptionsInput
    ? await listCashFlowInvoiceOptions(invoiceOptionsInput)
    : [];

  const selectedInvoiceIdRaw = Array.isArray(resolved.invoiceId)
    ? resolved.invoiceId[0]
    : resolved.invoiceId;
  const selectedInvoiceId = selectedInvoiceIdRaw || invoiceOptions[0]?.id || "";

  const prefillData = selectedInvoiceId
    ? await getInvoicePaymentPrefillData({
        invoiceId: selectedInvoiceId,
        paymentMonth: monthKey,
      })
    : undefined;

  const flashStatus = Array.isArray(resolved.flashStatus)
    ? resolved.flashStatus[0]
    : resolved.flashStatus;
  const flashMessage = Array.isArray(resolved.flashMessage)
    ? resolved.flashMessage[0]
    : resolved.flashMessage;

  const returnTo = `/employee-cash-flow?companyId=${encodeURIComponent(selectedCompanyId)}&month=${monthKey}${selectedInvoiceId ? `&invoiceId=${encodeURIComponent(selectedInvoiceId)}` : ""}`;
  const initialEntries: EmployeeCashFlowEditableEntry[] = prefillData
    ? aggregateEmployeeCashFlowEditableEntries(prefillData.entries)
    : [];

  return (
    <Shell title="Employee Cash Flow" eyebrow="Cash reality dashboard">
      <GlassPanel gradient>
        <form
          action="/employee-cash-flow"
          className="grid gap-3 md:grid-cols-[1.2fr_180px_1.2fr_auto] md:items-end"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Company
            </span>
            <select name="companyId" defaultValue={selectedCompanyId} className={inputClass}>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Month
            </span>
            <input name="month" type="month" defaultValue={monthKey} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Cashed-out invoice
            </span>
            <select name="invoiceId" defaultValue={selectedInvoiceId} className={inputClass}>
              {invoiceOptions.length === 0 ? (
                <option value="">No cashed-out invoices available</option>
              ) : (
                invoiceOptions.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} ({invoice.year}-{String(invoice.month).padStart(2, "0")})
                  </option>
                ))
              )}
            </select>
          </label>
          <PendingSubmitButton
            className="gradient-btn"
            defaultText="Load"
            pendingText="Loading..."
          />
        </form>

        {flashMessage ? (
          <div
            className="mt-4 rounded-2xl px-4 py-3 text-sm font-medium"
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
      </GlassPanel>

      <GlassPanel title="Editable Employee Cash Flow Rows" gradient>
        {prefillData ? (
          <EmployeeCashFlowEntryForm
            invoicePaymentId={prefillData.invoicePaymentId}
            invoiceId={prefillData.invoice.id}
            companyId={prefillData.invoice.companyId}
            paymentMonth={monthKey}
            returnTo={returnTo}
            invoiceNumber={prefillData.invoice.invoiceNumber}
            invoiceDollarInboundUsdCents={prefillData.invoice.dollarInboundUsdCents}
            invoiceUsdInrRate={prefillData.invoice.usdInrRate}
            initialEntries={initialEntries}
            availableEmployees={prefillData.availableEmployees}
          />
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Select a company, month, and cashed-out invoice to load aggregated employee cash flow cards.
          </p>
        )}
      </GlassPanel>
    </Shell>
  );
}
