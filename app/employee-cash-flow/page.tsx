import { ChecklistFilterDropdown } from "../_components/checklist-filter-dropdown";
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
  defaultEmployeeCashFlowPaidDate,
  resolveEmployeeCashFlowInvoiceIds,
  resolveEmployeeCashFlowMonthKey,
} from "@/src/features/billing/employee-cash-flow-page-state";
import {
  buildEmployeeCashFlowFilterFieldEntries,
  filterSavedCashFlowRows,
  formatPaymentMonthLabel,
  resolveSavedCashFlowFilters,
} from "@/src/features/billing/filter-selection";
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
    employeeIds?: string | string[];
    paymentMonths?: string | string[];
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
  const invoiceOptions = invoiceOptionsInput
    ? await listCashFlowInvoiceOptions(invoiceOptionsInput)
    : [];

  const selectedInvoiceIdsRaw = resolveEmployeeCashFlowInvoiceIds(resolved.invoiceId);
  const selectedInvoiceIds =
    selectedInvoiceIdsRaw.length > 0
      ? selectedInvoiceIdsRaw
      : invoiceOptions[0]?.id
        ? [invoiceOptions[0].id]
        : [];
  const savedFilters = resolveSavedCashFlowFilters({
    employeeIds: resolved.employeeIds,
    paymentMonths: resolved.paymentMonths,
  });

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

  const prefillData =
    prefillDataList.length > 0
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
      })
    : [];
  const filteredSavedRows = filterSavedCashFlowRows(savedRows, savedFilters);
  const savedEmployeeOptions = [...new Map(savedRows.map((row) => [row.employeeId, row.employeeNameSnapshot] as const)).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label) || left.value.localeCompare(right.value));
  const savedPaymentMonthOptions = [...new Set(savedRows.map((row) => row.paymentMonth))]
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ value, label: formatPaymentMonthLabel(value) }));

  const flashStatus = Array.isArray(resolved.flashStatus)
    ? resolved.flashStatus[0]
    : resolved.flashStatus;
  const flashMessage = Array.isArray(resolved.flashMessage)
    ? resolved.flashMessage[0]
    : resolved.flashMessage;

  const filterParams =
    selectedTab === "saved"
      ? [
          ...savedFilters.employeeIds.map(
            (employeeId) => `employeeIds=${encodeURIComponent(employeeId)}`,
          ),
          ...savedFilters.paymentMonths.map(
            (paymentMonth) => `paymentMonths=${encodeURIComponent(paymentMonth)}`,
          ),
        ]
      : selectedInvoiceIds.map((invoiceId) => `invoiceId=${encodeURIComponent(invoiceId)}`);
  const returnTo = `/employee-cash-flow?companyId=${encodeURIComponent(selectedCompanyId)}&month=${monthKey}&tab=${selectedTab}${filterParams.length ? `&${filterParams.join("&")}` : ""}`;
  const initialEntries: EmployeeCashFlowEditableEntry[] = prefillData
    ? aggregateEmployeeCashFlowEditableEntries(
        prefillData.entries.map((entry) => ({
          ...entry,
          paidAt: entry.paidAt ?? defaultEmployeeCashFlowPaidDate(monthKey),
        })),
      )
    : [];
  const tabSwitchHiddenFields = buildEmployeeCashFlowFilterFieldEntries({
    companyId: selectedCompanyId,
    month: monthKey,
    tab: selectedTab,
    invoiceIds: selectedInvoiceIds,
    employeeIds: savedFilters.employeeIds,
    paymentMonths: savedFilters.paymentMonths,
    includeCompanyId: true,
    includeMonth: true,
    includeTab: false,
  });

  return (
    <Shell title="Employee Cash Flow" eyebrow="Cash reality dashboard">
      <GlassPanel gradient className="overflow-visible">
        <form
          action="/employee-cash-flow"
          className={
            selectedTab === "saved"
              ? "grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end"
              : "grid gap-3 md:grid-cols-[1.2fr_180px_1.2fr_auto] md:items-end"
          }
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
          <input type="hidden" name="tab" value={selectedTab} />
          {selectedTab === "saved" ? <input type="hidden" name="month" value={monthKey} /> : null}
          {selectedTab === "compose" ? (
            <>
              <label className="block">
                <span className="mb-2 block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Month
                </span>
                <input name="month" type="month" defaultValue={monthKey} className={inputClass} />
              </label>
              <ChecklistFilterDropdown
                name="invoiceId"
                label="invoice"
                options={invoiceOptions.map((invoice) => {
                  const paymentMonth = `${invoice.year}-${String(invoice.month).padStart(2, "0")}`;

                  return {
                    value: invoice.id,
                    label: `${invoice.invoiceNumber} (${formatPaymentMonthLabel(paymentMonth)})`,
                  };
                })}
                defaultSelectedValues={selectedInvoiceIds}
                includeSelectAll
              />
            </>
          ) : (
            <>
              <ChecklistFilterDropdown
                name="employeeIds"
                label="employee"
                options={savedEmployeeOptions}
                defaultSelectedValues={savedFilters.employeeIds}
                includeSelectAll
              />
              <ChecklistFilterDropdown
                name="paymentMonths"
                label="payment month"
                options={savedPaymentMonthOptions}
                defaultSelectedValues={savedFilters.paymentMonths}
                includeSelectAll
              />
            </>
          )}
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

      <GlassPanel gradient className="overflow-visible">
        <form action="/employee-cash-flow" className="mb-2 flex flex-wrap items-center gap-2">
          {tabSwitchHiddenFields.map((field) => (
            <input key={`${field.name}:${field.value}`} type="hidden" name={field.name} value={field.value} />
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
          <EmployeeCashFlowSavedRows initialRows={filteredSavedRows} returnTo={returnTo} />
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
