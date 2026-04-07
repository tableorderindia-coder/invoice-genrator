export type InvoiceStatus = "draft" | "generated" | "sent" | "cashed_out";

export type Company = {
  id: string;
  name: string;
  billingAddress: string;
  defaultNote: string;
  createdAt: string;
};

export type Team = {
  id: string;
  companyId: string;
  name: string;
  createdAt: string;
};

export type Employee = {
  id: string;
  companyId: string;
  fullName: string;
  designation: string;
  defaultTeam: string;
  billingRateUsdCents: number;
  payoutRateUsdCents: number;
  activeFrom: string;
  activeTo?: string;
  isActive: boolean;
  createdAt: string;
};

export type Invoice = {
  id: string;
  companyId: string;
  month: number;
  year: number;
  invoiceNumber: string;
  billingDate: string;
  dueDate: string;
  status: InvoiceStatus;
  noteText: string;
  subtotalUsdCents: number;
  adjustmentsUsdCents: number;
  grandTotalUsdCents: number;
  sourceInvoiceId?: string;
  pdfPath?: string;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceTeam = {
  id: string;
  invoiceId: string;
  teamName: string;
  sortOrder: number;
};

export type InvoiceLineItem = {
  id: string;
  invoiceTeamId: string;
  employeeId: string;
  employeeNameSnapshot: string;
  designationSnapshot: string;
  teamNameSnapshot: string;
  billingRateUsdCents: number;
  payoutRateUsdCents: number;
  hoursBilled: number;
  billedTotalUsdCents: number;
  payoutTotalUsdCents: number;
  profitTotalUsdCents: number;
};

export type AdjustmentType =
  | "onboarding"
  | "offboarding"
  | "reimbursement";

export type InvoiceAdjustment = {
  id: string;
  invoiceId: string;
  type: AdjustmentType;
  label: string;
  employeeName?: string;
  amountUsdCents: number;
  sortOrder: number;
};

export type InvoiceRealization = {
  id: string;
  invoiceId: string;
  realizedAt: string;
  realizedRevenueUsdCents: number;
  realizedPayoutUsdCents: number;
  realizedProfitUsdCents: number;
  notes?: string;
  createdAt: string;
};

export type InvoiceDetail = {
  invoice: Invoice;
  company: Company;
  teams: Array<InvoiceTeam & { lineItems: InvoiceLineItem[] }>;
  adjustments: InvoiceAdjustment[];
  realization?: InvoiceRealization;
};

export type DashboardMetrics = {
  invoiceStatusCounts: Record<InvoiceStatus, number>;
  pendingCashOutCount: number;
  realizedProfitUsdCents: number;
  realizedProfitByCompany: Array<{
    companyId: string;
    companyName: string;
    realizedProfitUsdCents: number;
  }>;
  realizedProfitByEmployee: Array<{
    employeeId: string;
    employeeName: string;
    realizedProfitUsdCents: number;
  }>;
};
