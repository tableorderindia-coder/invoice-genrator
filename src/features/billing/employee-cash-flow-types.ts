import type { EmployeeCashFlowStatus } from "./employee-cash-flow";

export type EmployeeCashFlowMonthRow = {
  employeeId: string;
  employeeName: string;
  companyId: string;
  paymentMonth: string;
  invoiceNumber: string;
  daysWorked: number;
  daysInMonth: number;
  monthlyPaidUsdCents: number;
  baseDollarInwardUsdCents: number;
  onboardingAdvanceUsdCents: number;
  offboardingDeductionUsdCents: number;
  effectiveDollarInwardUsdCents: number;
  cashoutUsdInrRate: number;
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
