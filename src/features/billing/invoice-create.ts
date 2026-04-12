import type { InvoiceStatus } from "./types";

export function formatDuplicateInvoiceOptionLabel(
  invoiceNumber: string,
  status: InvoiceStatus,
) {
  return `${invoiceNumber} • ${formatInvoiceStatus(status)}`;
}

function formatInvoiceStatus(status: InvoiceStatus) {
  switch (status) {
    case "cashed_out":
      return "Cashed out";
    case "draft":
      return "Draft";
    case "generated":
      return "Generated";
    case "sent":
      return "Sent";
  }
}
