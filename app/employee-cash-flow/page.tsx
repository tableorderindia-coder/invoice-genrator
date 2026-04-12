import { GlassPanel } from "../_components/glass-panel";
import { inputClass } from "../_components/field";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { Shell } from "../_components/shell";
import {
  getInvoicePaymentPrefillData,
  listSavedEmployeeCashFlowEntries,
  listCashFlowInvoiceOptions,
} from "@/src/features/billing/employee-cash-flow-store";
import {
  buildEmployeeCashFlowInvoiceOptionsInput,
  resolveEmployeeCashFlowInvoiceIds,
  resolveEmployeeCashFlowMonthKey,
} from "@/src/features/billing/employee-cash-flow-page-state";
import { listCompanies } from "@/src/features/billing/store";
import {
  aggregateEmployeeCashFlowEditableEntries,
  type EmployeeCashFlowEditableEntry,
} from "@/src/features/billing/employee-cash-flow-entry-aggregation";

import EmployeeCashFlowEntryForm from "./_components/employee-cash-flow-entry-form";
import EmployeeCashFlowSavedRows from "./_components/employee-cash-flow-saved-rows";

export const dynamic = "force-dynamic";

export default async function EmployeeCashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string | string[];
    month?: string | string[];
    year?: string | string[];
    invoiceId?: string | string[];
    tab?: string | string[];
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
  const selectedTabRaw = Array.isArray(resolved.tab) ? resolved.tab[0] : resolved.tab;
  const selectedTab = selectedTabRaw === "saved" ? "saved" : "compose";

  const invoiceOptionsInput = buildEmployeeCashFlowInvoiceOptionsInput(selectedCompanyId);
  const [yearValue, monthValue] = monthKey.split("-").map((value) => Number.parseInt(value, 10));
  const invoiceOptions = invoiceOptionsInput
    ? await listCashFlowInvoiceOptions({
        ...invoiceOptionsInput,
        month: monthValue,
        year: yearValue,
      })
    : [];

  const selectedInvoiceIdsRaw = resolveEmployeeCashFlowInvoiceIds(resolved.invoiceId);
  const selectedInvoiceIds =
    selectedInvoiceIdsRaw.length > 0 ? selectedInvoiceIdsRaw : invoiceOptions[0]?.id ? [invoiceOptions[0].id] : [];

  const prefillDataList = selectedInvoiceIds.length
    ? await Promise.all(
        selectedInvoiceIds.map((invoiceId) =>
          getInvoicePaymentPrefillData({
            invoiceId,
            paymentMonth: monthKey,
          }),
        ),
      )
    : [];

  const prefillData = prefillDataList.length > 0
    ? {
        companyId: prefillDataList[0].invoice.companyId,
        selectedInvoices: prefillDataList.map((item) => ({
          clientBatchId: item.invoicePaymentId || item.invoice.id,
          batchLabel:
            item.invoicePaymentId && item.invoicePaymentId !== item.invoice.id
              ? `${item.invoice.invoiceNumber} • ${item.invoicePaymentId.slice(-6)}`
              : item.invoice.invoiceNumber,
          invoicePaymentId: item.invoicePaymentId,
          invoiceId: item.invoice.id,
          invoiceNumber: item.invoice.invoiceNumber,
          invoiceUsdInrRate: item.invoice.usdInrRate,
          availableEmployees: item.availableEmployees,
        })),
        entries: prefillDataList.flatMap((item) =>
          item.entries.map((entry) => ({
            ...entry,
            clientBatchId: item.invoicePaymentId || item.invoice.id,
            batchLabel:
              item.invoicePaymentId && item.invoicePaymentId !== item.invoice.id
                ? `${item.invoice.invoiceNumber} • ${item.invoicePaymentId.slice(-6)}`
                : item.invoice.invoiceNumber,
            invoicePaymentId: item.invoicePaymentId || undefined,
            invoiceId: item.invoice.id,
            invoiceNumber: item.invoice.invoiceNumber,
          })),
        ),
      }
    : undefined;

  const savedRows = selectedCompanyId
    ? await listSavedEmployeeCashFlowEntries({
        companyId: selectedCompanyId,
        paymentMonth: monthKey,
      })
    : [];

  const flashStatus = Array.isArray(resolved.flashStatus)
    ? resolved.flashStatus[0]
    : resolved.flashStatus;
  const flashMessage = Array.isArray(resolved.flashMessage)
    ? resolved.flashMessage[0]
    : resolved.flashMessage;

  const invoiceParams = selectedInvoiceIds
    .map((invoiceId) => `invoiceId=${encodeURIComponent(invoiceId)}`)
    .join("&");
  const returnTo = `/employee-cash-flow?companyId=${encodeURIComponent(selectedCompanyId)}&month=${monthKey}&tab=${selectedTab}${invoiceParams ? `&${invoiceParams}` : ""}`;
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
              Cashed-out invoices
            </span>
            <select
              name="invoiceId"
              multiple
              defaultValue={selectedInvoiceIds}
              className={inputClass}
              style={{ minHeight: "180px" }}
            >
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

      <GlassPanel gradient>
        <form action="/employee-cash-flow" className="mb-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="companyId" value={selectedCompanyId} />
          <input type="hidden" name="month" value={monthKey} />
          {selectedInvoiceIds.map((invoiceId) => (
            <input key={invoiceId} type="hidden" name="invoiceId" value={invoiceId} />
          ))}
          <PendingSubmitButton
            name="tab"
            value="compose"
            className={selectedTab === "compose" ? "gradient-btn" : "btn-outline"}
            defaultText="Compose"
            pendingText="Loading..."
          />
          <PendingSubmitButton
            name="tab"
            value="saved"
            className={selectedTab === "saved" ? "gradient-btn" : "btn-outline"}
            defaultText="Saved Rows"
            pendingText="Loading..."
          />
        </form>
      </GlassPanel>

      <GlassPanel
        title={selectedTab === "saved" ? "Saved Employee Cash Flow Rows" : "Editable Employee Cash Flow Rows"}
        gradient
      >
        {selectedTab === "saved" ? (
          <EmployeeCashFlowSavedRows initialRows={savedRows} returnTo={returnTo} />
        ) : prefillData ? (
          <EmployeeCashFlowEntryForm
            companyId={prefillData.companyId}
            paymentMonth={monthKey}
            returnTo={returnTo}
            initialEntries={initialEntries}
            selectedInvoices={prefillData.selectedInvoices}
          />
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Select a company, month, and one or more cashed-out invoices to load invoice-level employee cash flow cards.
          </p>
        )}
      </GlassPanel>
    </Shell>
  );
}
