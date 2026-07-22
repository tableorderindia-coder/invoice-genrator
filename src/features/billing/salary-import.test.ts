import { describe, expect, it } from "vitest";

import {
  applySalaryImportToRows,
  buildSalaryImportTemplateRows,
  matchSalaryImportRows,
  parseSalaryImportCsv,
  parseSalaryImportSheetRows,
} from "./salary-import";
import type { MonthlyPayrollRow } from "./payroll";

const payrollRows: MonthlyPayrollRow[] = [
  {
    employeeId: "emp_1",
    companyId: "company_1",
    month: "2026-07",
    employeeName: "Ankit Singh",
    source: "employee-default",
    paidUsdInrRate: 0,
    basicInrCents: 0,
    specialAllowanceInrCents: 0,
    insuranceInrCents: 0,
    bonusInrCents: 0,
    monthlyPaidInrCents: 0,
    daysWorked: 31,
    daysInMonth: 31,
    actualPaidInrCents: 0,
    salaryPaidInrCents: 0,
    pfInrCents: 0,
    tdsInrCents: 0,
    paidStatus: false,
    status: "draft",
    panNumber: "ABCDE1234F",
  } as MonthlyPayrollRow & { panNumber?: string },
  {
    employeeId: "emp_2",
    companyId: "company_1",
    month: "2026-07",
    employeeName: "Beesetti Kiran Suresh",
    source: "employee-default",
    paidUsdInrRate: 0,
    basicInrCents: 0,
    specialAllowanceInrCents: 0,
    insuranceInrCents: 0,
    bonusInrCents: 0,
    monthlyPaidInrCents: 0,
    daysWorked: 31,
    daysInMonth: 31,
    actualPaidInrCents: 0,
    salaryPaidInrCents: 0,
    pfInrCents: 0,
    tdsInrCents: 0,
    paidStatus: false,
    status: "draft",
  },
];

describe("salary import", () => {
  it("parses CSV and maps structured salary components", () => {
    const csv = [
      "Name,Month,Year,Days Worked,Basic,Special Allowance,Insurance,Bonus,PF(Employee),Income Tax,PAN Number,PF UAN,Designation,Joining Date",
      "Ankit Singh,July,2026,15.5,100000,25000,5000,2000,1800,5000,ABCDE1234F,100200300,Engineer,2025-04-01",
    ].join("\n");

    const result = parseSalaryImportCsv(csv, {
      selectedMonth: "2026-07",
      sourceFileName: "salary.csv",
    });

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      employeeName: "Ankit Singh",
      payrollMonth: "2026-07",
      daysWorked: 15.5,
      basicInrCents: 10_000_000,
      specialAllowanceInrCents: 2_500_000,
      insuranceInrCents: 500_000,
      bonusInrCents: 200_000,
      pfInrCents: 180_000,
      tdsInrCents: 500_000,
      panNumber: "ABCDE1234F",
      pfUan: "100200300",
      designation: "Engineer",
      joiningDate: "2025-04-01",
    });
  });

  it("parses sheet rows with the same template headers as CSV", () => {
    const result = parseSalaryImportSheetRows(
      [
        buildSalaryImportTemplateRows()[0],
        [
          "Beesetti Kiran Suresh",
          "July",
          "2026",
          31,
          90000,
          10000,
          3000,
          "",
          1800,
          2500,
          "",
          "",
          "Consultant",
          "04/01/2025",
        ],
      ],
      { selectedMonth: "2026-07", sourceFileName: "salary.xlsx" },
    );

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({
      employeeName: "Beesetti Kiran Suresh",
      bonusInrCents: 0,
      specialAllowanceInrCents: 1_000_000,
    });
  });

  it("rejects files for a different selected salary month", () => {
    const result = parseSalaryImportCsv(
      [
        "Name,Month,Year,Days Worked,Basic,Special Allowance,Insurance,Bonus,PF(Employee),Income Tax",
        "Ankit Singh,June,2026,30,100000,0,0,0,1800,5000",
      ].join("\n"),
      { selectedMonth: "2026-07", sourceFileName: "salary.csv" },
    );

    expect(result.errors).toEqual([
      "salary.csv is for 2026-06, but the selected salary month is 2026-07.",
    ]);
    expect(result.rows).toEqual([]);
  });

  it("matches by PAN before normalized name and reports unmatched rows", () => {
    const rows = parseSalaryImportCsv(
      [
        "Name,Month,Year,Days Worked,Basic,Special Allowance,Insurance,Bonus,PF(Employee),Income Tax,PAN Number",
        "Different Name,July,2026,31,100000,0,0,0,1800,5000,ABCDE1234F",
        "Unknown Person,July,2026,31,100000,0,0,0,1800,5000,",
      ].join("\n"),
      { selectedMonth: "2026-07", sourceFileName: "salary.csv" },
    ).rows;

    const result = matchSalaryImportRows({ importRows: rows, payrollRows });

    expect(result.matches[0]).toMatchObject({
      employeeId: "emp_1",
      employeeName: "Ankit Singh",
      matchType: "pan",
    });
    expect(result.unmatched.map((row) => row.employeeName)).toEqual(["Unknown Person"]);
  });

  it("applies matched rows without calculating totals or writing data", () => {
    const importRow = parseSalaryImportCsv(
      [
        "Name,Month,Year,Days Worked,Basic,Special Allowance,Insurance,Bonus,PF(Employee),Income Tax",
        "Beesetti Kiran Suresh,July,2026,20.25,90000,10000,3000,4000,1800,2500",
      ].join("\n"),
      { selectedMonth: "2026-07", sourceFileName: "salary.csv" },
    ).rows[0];

    const updated = applySalaryImportToRows({
      payrollRows,
      matches: [
        {
          employeeId: "emp_2",
          employeeName: "Beesetti Kiran Suresh",
          importRow,
          matchType: "name",
        },
      ],
      sourceFileName: "salary.csv",
    });

    expect(updated.find((row) => row.employeeId === "emp_2")).toMatchObject({
      daysWorked: 20.25,
      basicInrCents: 9_000_000,
      specialAllowanceInrCents: 1_000_000,
      insuranceInrCents: 300_000,
      bonusInrCents: 400_000,
      pfInrCents: 180_000,
      tdsInrCents: 250_000,
      notes: "Imported from file: salary.csv",
    });
  });
});
