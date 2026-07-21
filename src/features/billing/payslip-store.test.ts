import { describe, expect, it } from "vitest";

import { preparePayslipRecords } from "./payslip-store";
import type { Employee } from "./types";
import type { MonthlyPayrollRow } from "./payroll";

function employee(id: string, fullName: string): Employee {
  return {
    id,
    companyId: "company_1",
    fullName,
    panNumber: `PAN-${id}`,
    pfUan: `UAN-${id}`,
    designation: "Engineer",
    defaultTeam: "Data",
    billingRateUsdCents: 1000,
    defaultPaidUsdInrRate: 85,
    defaultActualPaidInrCents: 80_000_00,
    defaultPfInrCents: 0,
    defaultTdsInrCents: 0,
    hrsPerWeek: 40,
    activeFrom: "2026-04-01",
    isActive: true,
    createdAt: "2026-04-01T00:00:00.000Z",
  };
}

function inactiveEmployee(id: string, fullName: string): Employee {
  return {
    ...employee(id, fullName),
    isActive: false,
  };
}

function payroll(employeeId: string, employeeName: string): MonthlyPayrollRow {
  return {
    employeeId,
    companyId: "company_1",
    month: "2026-04",
    employeeName,
    source: "monthly-payroll",
    paidUsdInrRate: 85,
    salaryPaidInrCents: 80_000_00,
    pfInrCents: 1_800_00,
    tdsInrCents: 2_500_00,
    paidStatus: true,
    status: "verified",
  };
}

describe("payslip store shaping", () => {
  it("creates missing records from saved payroll rows and preserves existing edited payslips", () => {
    const records = preparePayslipRecords({
      companyId: "company_1",
      month: "2026-04",
      employees: [employee("emp_1", "Asha"), employee("emp_2", "Bala")],
      payrollRows: [payroll("emp_1", "Asha"), payroll("emp_2", "Bala")],
      templatesByEmployeeId: new Map(),
      existingPayslips: [
        {
          id: "payslip_existing",
          companyId: "company_1",
          employeeId: "emp_1",
          employeeName: "Asha Edited",
          month: "2026-04",
          panNumber: "EDITED-PAN",
          pfUan: "",
          joiningDate: "2026-04-01",
          designation: "Engineer",
          effectiveWorkDays: 29,
          earnings: [{ label: "CUSTOM", amountInrCents: 77_000_00, sortOrder: 1 }],
          deductions: [{ label: "INCOME TAX", amountInrCents: 1_000_00, sortOrder: 1 }],
          tdsEarnings: [],
          tdsIncomeTaxDeductions: [],
          taxPaidMonths: [],
          updatedAt: "2026-04-30T00:00:00.000Z",
        },
      ],
      previousTaxPaidByEmployeeId: new Map(),
    });

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      id: "payslip_existing",
      employeeId: "emp_1",
      employeeName: "Asha Edited",
      panNumber: "EDITED-PAN",
      effectiveWorkDays: 29,
    });
    expect(records[1]).toMatchObject({
      employeeId: "emp_2",
      employeeName: "Bala",
      panNumber: "PAN-emp_2",
      effectiveWorkDays: 30,
    });
  });

  it("resets selected employees from salary and template while leaving other edits untouched", () => {
    const records = preparePayslipRecords({
      companyId: "company_1",
      month: "2026-04",
      employees: [employee("emp_1", "Asha"), employee("emp_2", "Bala")],
      payrollRows: [payroll("emp_1", "Asha"), payroll("emp_2", "Bala")],
      templatesByEmployeeId: new Map(),
      existingPayslips: [
        {
          id: "payslip_1",
          companyId: "company_1",
          employeeId: "emp_1",
          employeeName: "Asha Edited",
          month: "2026-04",
          panNumber: "EDITED-PAN",
          pfUan: "",
          joiningDate: "2026-04-01",
          designation: "Engineer",
          effectiveWorkDays: 12,
          earnings: [{ label: "CUSTOM", amountInrCents: 1_00, sortOrder: 1 }],
          deductions: [],
          tdsEarnings: [],
          tdsIncomeTaxDeductions: [],
          taxPaidMonths: [],
        },
        {
          id: "payslip_2",
          companyId: "company_1",
          employeeId: "emp_2",
          employeeName: "Bala Edited",
          month: "2026-04",
          panNumber: "BALA-EDITED",
          pfUan: "",
          joiningDate: "2026-04-01",
          designation: "Engineer",
          effectiveWorkDays: 10,
          earnings: [{ label: "CUSTOM", amountInrCents: 2_00, sortOrder: 1 }],
          deductions: [],
          tdsEarnings: [],
          tdsIncomeTaxDeductions: [],
          taxPaidMonths: [],
        },
      ],
      previousTaxPaidByEmployeeId: new Map(),
      resetEmployeeIds: new Set(["emp_1"]),
    });

    expect(records[0]).toMatchObject({
      id: "payslip_1",
      employeeName: "Asha",
      panNumber: "PAN-emp_1",
      effectiveWorkDays: 30,
    });
    expect(records[0]?.earnings[0]).toMatchObject({ label: "BASIC" });
    expect(records[1]).toMatchObject({
      id: "payslip_2",
      employeeName: "Bala Edited",
      panNumber: "BALA-EDITED",
      effectiveWorkDays: 10,
    });
  });

  it("does not create new payslips for inactive employees but preserves existing saved records", () => {
    const records = preparePayslipRecords({
      companyId: "company_1",
      month: "2026-04",
      employees: [employee("emp_1", "Asha"), inactiveEmployee("emp_2", "Bala")],
      payrollRows: [payroll("emp_1", "Asha"), payroll("emp_2", "Bala")],
      templatesByEmployeeId: new Map(),
      existingPayslips: [
        {
          id: "payslip_existing_inactive",
          companyId: "company_1",
          employeeId: "emp_2",
          employeeName: "Bala Existing",
          month: "2026-04",
          panNumber: "BALA-PAN",
          pfUan: "",
          joiningDate: "2026-04-01",
          designation: "Engineer",
          effectiveWorkDays: 30,
          earnings: [{ label: "BASIC", amountInrCents: 80_000_00, sortOrder: 1 }],
          deductions: [],
          tdsEarnings: [],
          tdsIncomeTaxDeductions: [],
          taxPaidMonths: [],
        },
      ],
      previousTaxPaidByEmployeeId: new Map(),
    });

    expect(records.map((record) => record.employeeId)).toEqual(["emp_1", "emp_2"]);
    expect(records.find((record) => record.employeeId === "emp_2")).toMatchObject({
      id: "payslip_existing_inactive",
      employeeName: "Bala Existing",
    });

    const freshRecords = preparePayslipRecords({
      companyId: "company_1",
      month: "2026-04",
      employees: [employee("emp_1", "Asha"), inactiveEmployee("emp_2", "Bala")],
      payrollRows: [payroll("emp_1", "Asha"), payroll("emp_2", "Bala")],
      templatesByEmployeeId: new Map(),
      existingPayslips: [],
      previousTaxPaidByEmployeeId: new Map(),
    });

    expect(freshRecords.map((record) => record.employeeId)).toEqual(["emp_1"]);
  });
});
