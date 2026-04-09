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
  payoutMonthlyUsdCents: number;
  hrsPerWeek: number;
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
  billingDuration?: string;
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
  payoutMonthlyUsdCentsSnapshot: number;
  hrsPerWeek: number;
  billedTotalUsdCents: number;
  payoutTotalUsdCents: number;
  profitTotalUsdCents: number;
};

export type AdjustmentType =
  | "onboarding"
  | "offboarding"
  | "reimbursement"
  | "appraisal";

export type InvoiceAdjustment = {
  id: string;
  invoiceId: string;
  type: AdjustmentType;
  label: string;
  employeeName?: string;
  rateUsdCents?: number;
  hrsPerWeek?: number;
  amountUsdCents: number;
  sortOrder: number;
};

export type InvoiceRealization = {
  id: string;
  invoiceId: string;
  realizedAt: string;
  dollarInboundUsdCents: number;
  usdInrRate: number;
  realizedRevenueUsdCents: number;
  realizedPayoutUsdCents: number;
  realizedProfitUsdCents: number;
  notes?: string;
  createdAt: string;
};

export type EmployeePayout = {
  id: string;
  invoiceId: string;
  companyId: string;
  employeeId: string;
  invoiceLineItemId?: string;
  employeeNameSnapshot: string;
  dollarInwardUsdCents: number;
  employeeMonthlyUsdCents: number;
  cashoutUsdInrRate: number;
  paidUsdInrRate?: number;
  pfInrCents: number;
  tdsInrCents: number;
  actualPaidInrCents: number;
  fxCommissionInrCents?: number;
  totalCommissionUsdCents: number;
  commissionEarnedInrCents?: number;
  isNonInvoiceEmployee: boolean;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type EmployeePayoutInvoice = {
  invoice: Invoice;
  realization: InvoiceRealization;
  rows: EmployeePayout[];
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
  realizedRevenueUsdCents: number;
  bankChargesUsdCents: number;
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

export type PnPeriodType = "monthly" | "yearly";

export type PnEmployeeMonthRow = {
  year: number;
  month: number;
  dollarInwardUsdCents: number;
  employeeMonthlyUsdCents: number;
  cashoutUsdInrRate: number;
  paidUsdInrRate: number;
  pfInrCents: number;
  tdsInrCents: number;
  actualPaidInrCents: number;
  fxCommissionInrCents: number;
  totalCommissionUsdCents: number;
  commissionEarnedInrCents: number;
  grossEarningsInrCents: number;
};

export type PnEmployeeSection = {
  employeeId: string;
  employeeName: string;
  rows: PnEmployeeMonthRow[];
  totalGrossEarningsInrCents: number;
};

export type PnEmployeeEditableRow = {
  payoutId: string;
  invoiceId: string;
  invoiceNumber: string;
  year: number;
  month: number;
  dollarInwardUsdCents: number;
  employeeMonthlyUsdCents: number;
  cashoutUsdInrRate: number;
  paidUsdInrRate: number;
  pfInrCents: number;
  tdsInrCents: number;
  actualPaidInrCents: number;
  fxCommissionInrCents: number;
  totalCommissionUsdCents: number;
  commissionEarnedInrCents: number;
  grossEarningsInrCents: number;
  isSecurityDepositMonth: boolean;
};

export type PnEmployeeEditableSection = {
  employeeId: string;
  employeeName: string;
  rows: PnEmployeeEditableRow[];
  totalGrossEarningsInrCents: number;
};

export type PnPeriodRow = {
  year: number;
  month?: number;
  dollarInwardUsdCents: number;
  employeeMonthlyUsdCents: number;
  pfInrCents: number;
  tdsInrCents: number;
  actualPaidInrCents: number;
  fxCommissionInrCents: number;
  totalCommissionUsdCents: number;
  commissionEarnedInrCents: number;
  grossEarningsInrCents: number;
  expensesInrCents: number;
  netPlInrCents: number;
};

export type PnDashboardData = {
  companyId: string;
  employeeEditableSections: PnEmployeeEditableSection[];
  employeeSections: PnEmployeeSection[];
  periodRows: PnPeriodRow[];
};
