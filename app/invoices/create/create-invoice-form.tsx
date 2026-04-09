"use client";

import { useEffect, useState } from "react";

import { Field, inputClass } from "../../_components/field";

type CompanyOption = {
  id: string;
  name: string;
};

type CreateInvoiceFormProps = {
  companies: CompanyOption[];
  latestInvoices: Array<{
    companyId: string;
    companyName: string;
    invoiceId: string;
    invoiceNumber: string;
  }>;
  availableTeamNamesByCompany: Record<string, string[]>;
};

export function CreateInvoiceForm(props: CreateInvoiceFormProps) {
  const initialCompanyId = props.companies[0]?.id ?? "";
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [month, setMonth] = useState("4");
  const [year, setYear] = useState("2026");
  const [billingDuration, setBillingDuration] = useState(
    () => buildDefaultBillingDuration(4, 2026) || "",
  );
  const availableTeamNames = props.availableTeamNamesByCompany[companyId] ?? [];

  useEffect(() => {
    const parsedMonth = Number.parseInt(month, 10);
    const parsedYear = Number.parseInt(year, 10);
    const nextBillingDuration = buildDefaultBillingDuration(parsedMonth, parsedYear);
    if (nextBillingDuration) {
      setBillingDuration(nextBillingDuration);
    }
  }, [month, year]);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Field label="Company">
        <select
          name="companyId"
          required
          className={inputClass}
          value={companyId}
          onChange={(event) => setCompanyId(event.target.value)}
        >
          {props.companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Month">
        <input
          name="month"
          type="number"
          min="1"
          max="12"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          required
          className={inputClass}
        />
      </Field>
      <Field label="Year">
        <input
          name="year"
          type="number"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          required
          className={inputClass}
        />
      </Field>
      <Field label="Invoice number">
        <input name="invoiceNumber" required className={inputClass} placeholder="INV-2026-001" />
      </Field>
      <Field label="Billing date">
        <input name="billingDate" type="date" required className={inputClass} />
      </Field>
      <Field label="Billing duration">
        <input
          name="billingDuration"
          required
          className={inputClass}
          value={billingDuration}
          onChange={(event) => setBillingDuration(event.target.value)}
          placeholder="MM/DD/YYYY - MM/DD/YYYY"
        />
      </Field>
      <Field label="Due date">
        <input name="dueDate" type="date" required className={inputClass} />
      </Field>
      <Field label="Duplicate from previous invoice">
        <select name="duplicateSourceId" className={inputClass}>
          <option value="">Start empty</option>
          {props.latestInvoices
            .filter((invoice) => invoice.companyId === companyId)
            .map((invoice) => (
              <option key={invoice.invoiceId} value={invoice.invoiceId}>
                {invoice.companyName} · {invoice.invoiceNumber}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Select teams">
        <select name="selectedTeamNames" multiple className={inputClass} size={Math.max(4, availableTeamNames.length || 4)}>
          {availableTeamNames.map((teamName) => (
            <option key={teamName} value={teamName}>
              {teamName}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

function buildDefaultBillingDuration(month: number, year: number) {
  if (!Number.isFinite(month) || !Number.isFinite(year) || month < 1 || month > 12 || year < 1) {
    return undefined;
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return `${formatUsDate(start)} - ${formatUsDate(end)}`;
}

function formatUsDate(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}
