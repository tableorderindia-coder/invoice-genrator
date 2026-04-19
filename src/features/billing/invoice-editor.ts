import type { InvoiceDetail, InvoiceStatus } from "./types";

type InvoiceHeaderFormInput = {
  companyId: string;
  companyName: string;
  invoiceNumber: string;
  month: string;
  year: string;
  billingDate: string;
  dueDate: string;
  status: string;
};

const invoiceStatuses: InvoiceStatus[] = ["draft", "generated", "sent", "cashed_out"];

function isInvoiceStatus(value: string): value is InvoiceStatus {
  return invoiceStatuses.includes(value as InvoiceStatus);
}

export function resolveSelectedTeam(
  teams: InvoiceDetail["teams"],
  requestedTeamId?: string,
) {
  if (teams.length === 0) {
    return undefined;
  }

  if (requestedTeamId) {
    const requestedTeam = teams.find((team) => team.id === requestedTeamId);
    if (requestedTeam) {
      return requestedTeam;
    }
  }

  return teams[0];
}

export function parseInvoiceHeaderFormInput(input: InvoiceHeaderFormInput) {
  const companyId = input.companyId.trim();
  const companyName = input.companyName.trim();
  const invoiceNumber = input.invoiceNumber.trim();
  const month = Number.parseInt(input.month, 10);
  const year = Number.parseInt(input.year, 10);
  const billingDate = input.billingDate.trim();
  const dueDate = input.dueDate.trim();
  const status = input.status.trim();

  if (!companyId) {
    throw new Error("Company is required.");
  }
  if (!companyName) {
    throw new Error("Company name is required.");
  }
  if (!invoiceNumber) {
    throw new Error("Invoice number is required.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12.");
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Year must be valid.");
  }
  if (!billingDate) {
    throw new Error("Billing date is required.");
  }
  if (!dueDate) {
    throw new Error("Due date is required.");
  }
  if (!isInvoiceStatus(status)) {
    throw new Error("Status is invalid.");
  }

  return {
    companyId,
    companyName,
    invoiceNumber,
    month,
    year,
    billingDate,
    dueDate,
    status,
  };
}
