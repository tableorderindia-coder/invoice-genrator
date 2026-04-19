import type { Invoice } from "./types";

function isIssuedInvoice(invoice: Invoice) {
  return invoice.status === "generated" || invoice.status === "sent";
}

export function filterDraftInvoices(invoices: Invoice[]) {
  return invoices.filter((invoice) => invoice.status === "draft");
}

export function filterIssuedInvoices(invoices: Invoice[]) {
  return invoices.filter(isIssuedInvoice);
}

export function filterCashoutEligibleInvoices(invoices: Invoice[]) {
  return invoices.filter(isIssuedInvoice);
}
