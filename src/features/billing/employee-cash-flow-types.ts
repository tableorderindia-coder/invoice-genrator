import type { EmployeeCashFlowStatus } from "./employee-cash-flow";

export type EmployeeCashFlowMonthRow = {
  employeeId: string;
  employeeName: string;
  companyId: string;
  paymentMonth: string;
  invoiceNumber: string;
  invoicePaymentId?: string;
  clientBatchId?: string;
  batchLabel?: string;
  daysWorked: number;
  daysInMonth: number;
  monthlyPaidUsdCents: number;
  baseDollarInwardUsdCents: number;
  onboardingAdvanceUsdCents: number;
  reimbursementUsdCents: number;
  reimbursementLabelsText: string;
  appraisalAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
  effectiveDollarInwardUsdCents: number;
  cashoutUsdInrRate: number;
  reimbursementInrCents: number;
  appraisalAdvanceInrCents: number;
  paidUsdInrRate: number;
  cashInInrCents: number;
  salaryPaidInrCents: number;
  pendingAmountInrCents: number;
  netInrCents: number;
  status: EmployeeCashFlowStatus;
};

export type EmployeeCashFlowSalaryPaymentRow = {
  id: string;
  employeeId: string;
  companyId: string;
  month: string;
  salaryUsdCents: number;
  paidUsdInrRate: number;
  salaryPaidInrCents: number;
  paidStatus: boolean;
  paidDate?: string;
  notes?: string;
};

export type EmployeeCashFlowInvoiceOption = {
  id: string;
  invoiceNumber: string;
  companyId: string;
  month: number;
  year: number;
};

export type EmployeeCashFlowEntryWriteInput = {
  clientBatchId: string;
  batchLabel?: string;
  invoicePaymentId?: string;
  invoiceId: string;
  invoiceNumber: string;
  employeeId: string;
  employeeNameSnapshot: string;
  invoiceLineItemId?: string;
  daysWorked: number;
  daysInMonth: number;
  monthlyPaidUsdCents: number;
  baseDollarInwardUsdCents: number;
  onboardingAdvanceUsdCents: number;
  reimbursementUsdCents: number;
  reimbursementLabelsText: string;
  appraisalAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
  cashoutUsdInrRate: number;
  paidUsdInrRate: number;
  pfInrCents: number;
  tdsInrCents: number;
  actualPaidInrCents: number;
  fxCommissionInrCents: number;
  totalCommissionUsdCents: number;
  commissionEarnedInrCents: number;
  grossEarningsInrCents: number;
  isNonInvoiceEmployee: boolean;
  isPaid: boolean;
  paidAt?: string;
  notes?: string;
};

export type EmployeeCashFlowEditableEntry = EmployeeCashFlowEntryWriteInput & {
  id: string;
};

export type EmployeeCashFlowSavedEntry = EmployeeCashFlowEntryWriteInput & {
  id: string;
  companyId: string;
  paymentMonth: string;
};
