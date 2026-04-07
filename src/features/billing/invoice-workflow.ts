import type { Invoice } from "./types";

export function filterDraftInvoices(invoices: Invoice[]) {
  return invoices.filter((invoice) => invoice.status === "draft");
}

export function filterIssuedInvoices(invoices: Invoice[]) {
  return invoices.filter(
    (invoice) => invoice.status === "generated" || invoice.status === "sent",
  );
}

export function filterCashoutEligibleInvoices(invoices: Invoice[]) {
  return invoices.filter(
    (invoice) => invoice.status === "generated" || invoice.status === "sent",
  );
}
