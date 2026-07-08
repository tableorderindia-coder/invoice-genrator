import { describe, expect, it } from "vitest";

import {
  buildMonthlyPayrollRows,
  normalizePayrollMonthKey,
  summarizePayrollRows,
  type MonthlyPayrollPayment,
} from "./payroll";
import type { Employee } from "./types";

const employee = (patch: Partial<Employee> = {}): Employee => ({
  id: "employee_1",
  companyId: "company_1",
  fullName: "Jane Doe",
  designation: "Engineer",
  defaultTeam: "Engineering",
  billingRateUsdCents: 4000,
  defaultPaidUsdInrRate: 83,
  defaultActualPaidInrCents: 250_000,
  defaultPfInrCents: 18_000,
  defaultTdsInrCents: 12_000,
  hrsPerWeek: 40,
  activeFrom: "2026-01-01",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...patch,
});

describe("payroll helpers", () => {
  it("normalizes valid month keys and rejects invalid input", () => {
    expect(normalizePayrollMonthKey("2026-07")).toBe("2026-07");
    expect(() => normalizePayrollMonthKey("2026-7")).toThrow("Payroll month is invalid.");
    expect(() => normalizePayrollMonthKey("2026-13")).toThrow("Payroll month is invalid.");
  });

  it("prefills missing salary records from employee master defaults", () => {
    const rows = buildMonthlyPayrollRows({
      companyId: "company_1",
      month: "2026-07",
      employees: [employee()],
      payments: [],
    });

    expect(rows).toEqual([
      expect.objectContaining({
        employeeId: "employee_1",
        employeeName: "Jane Doe",
        source: "employee-default",
        salaryPaidInrCents: 250_000,
        pfInrCents: 18_000,
        tdsInrCents: 12_000,
        paidUsdInrRate: 83,
        status: "draft",
      }),
    ]);
  });

  it("uses saved monthly payroll values ahead of employee defaults", () => {
    const payment: MonthlyPayrollPayment = {
      id: "salary_payment_1",
      employeeId: "employee_1",
      companyId: "company_1",
      month: "2026-07",
      employeeNameSnapshot: "Jane Snapshot",
      paidUsdInrRate: 84,
      salaryPaidInrCents: 310_000,
      pfInrCents: 20_000,
      tdsInrCents: 30_000,
      paidStatus: true,
      paidDate: "2026-07-31",
      status: "verified",
      notes: "Checked by CA",
      overrideNote: "Admin final amount",
    };

    const rows = buildMonthlyPayrollRows({
      companyId: "company_1",
      month: "2026-07",
      employees: [employee()],
      payments: [payment],
    });

    expect(rows[0]).toEqual(
      expect.objectContaining({
        id: "salary_payment_1",
        employeeName: "Jane Snapshot",
        source: "monthly-payroll",
        salaryPaidInrCents: 310_000,
        pfInrCents: 20_000,
        tdsInrCents: 30_000,
        paidStatus: true,
        status: "verified",
        overrideNote: "Admin final amount",
      }),
    );
  });

  it("summarizes salary, PF, TDS, and net paid totals", () => {
    expect(
      summarizePayrollRows([
        {
          employeeId: "employee_1",
          companyId: "company_1",
          month: "2026-07",
          employeeName: "Jane Doe",
          source: "employee-default",
          paidUsdInrRate: 83,
          salaryPaidInrCents: 100_000,
          pfInrCents: 10_000,
          tdsInrCents: 5_000,
          paidStatus: false,
          status: "draft",
        },
      ]),
    ).toEqual({
      employeeCount: 1,
      salaryPaidInrCents: 100_000,
      pfInrCents: 10_000,
      tdsInrCents: 5_000,
      netPaidInrCents: 85_000,
    });
  });
});
