// @vitest-environment jsdom

import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  buildEmployeeCashFlowFilterFieldEntries,
  buildDashboardFilterFieldEntries,
  filterSavedCashFlowRows,
  formatPaymentMonthLabel,
  normalizeMultiSelectValue,
  resolveSavedCashFlowFilters,
} from "./filter-selection";
import {
  ChecklistFilterDropdown,
  getChecklistFilterTriggerLabel,
} from "../../../app/_components/checklist-filter-dropdown";

describe("filter selection helpers", () => {
  it("normalizes repeated and comma-separated multi-select values", () => {
    expect(normalizeMultiSelectValue([" emp_1 ", "emp_2, emp_1", "", "emp_2"])).toEqual([
      "emp_1",
      "emp_2",
    ]);
  });

  it("formats payment months as readable labels", () => {
    expect(formatPaymentMonthLabel("2026-04")).toBe("April 2026");
  });

  it("falls back to the raw payment month when the month key is invalid", () => {
    expect(formatPaymentMonthLabel("not-a-month")).toBe("not-a-month");
  });

  it("falls back to the raw payment month when the month key has an invalid month number", () => {
    expect(formatPaymentMonthLabel("2026-00")).toBe("2026-00");
    expect(formatPaymentMonthLabel("2026-13")).toBe("2026-13");
  });

  it("filters saved cash flow rows by employee and month", () => {
    const rows = [
      { id: "row_1", employeeId: "emp_1", paymentMonth: "2026-04" },
      { id: "row_2", employeeId: "emp_2", paymentMonth: "2026-04" },
      { id: "row_3", employeeId: "emp_1", paymentMonth: "2026-05" },
    ];

    expect(
      filterSavedCashFlowRows(rows, {
        employeeIds: ["emp_1"],
        paymentMonths: ["2026-04"],
      }),
    ).toEqual([{ id: "row_1", employeeId: "emp_1", paymentMonth: "2026-04" }]);
  });

  it("filters saved cash flow rows by employee only", () => {
    const rows = [
      { id: "row_1", employeeId: "emp_1", paymentMonth: "2026-04" },
      { id: "row_2", employeeId: "emp_2", paymentMonth: "2026-05" },
    ];

    expect(
      filterSavedCashFlowRows(rows, {
        employeeIds: ["emp_2"],
      }),
    ).toEqual([{ id: "row_2", employeeId: "emp_2", paymentMonth: "2026-05" }]);
  });

  it("filters saved cash flow rows by month only", () => {
    const rows = [
      { id: "row_1", employeeId: "emp_1", paymentMonth: "2026-04" },
      { id: "row_2", employeeId: "emp_2", paymentMonth: "2026-05" },
    ];

    expect(
      filterSavedCashFlowRows(rows, {
        paymentMonths: ["2026-05"],
      }),
    ).toEqual([{ id: "row_2", employeeId: "emp_2", paymentMonth: "2026-05" }]);
  });

  it("treats empty filter arrays as no restriction", () => {
    const rows = [
      { id: "row_1", employeeId: "emp_1", paymentMonth: "2026-04" },
      { id: "row_2", employeeId: "emp_2", paymentMonth: "2026-05" },
    ];

    expect(
      filterSavedCashFlowRows(rows, {
        employeeIds: [],
        paymentMonths: [],
      }),
    ).toEqual(rows);
  });

  it("normalizes saved-tab employee and month filters from search params", () => {
    expect(
      resolveSavedCashFlowFilters({
        employeeIds: [" emp_1 ", "emp_2,emp_1"],
        paymentMonths: "2026-04, 2026-05",
      }),
    ).toEqual({
      employeeIds: ["emp_1", "emp_2"],
      paymentMonths: ["2026-04", "2026-05"],
    });
  });

  it("builds saved-flow form fields with month and tab preserved", () => {
    expect(
      buildEmployeeCashFlowFilterFieldEntries({
        companyId: "comp_1",
        month: "2026-04",
        tab: "saved",
        employeeIds: ["emp_1"],
        paymentMonths: ["2026-04"],
        includeTab: true,
      }),
    ).toEqual([
      { name: "companyId", value: "comp_1" },
      { name: "month", value: "2026-04" },
      { name: "tab", value: "saved" },
      { name: "employeeIds", value: "emp_1" },
      { name: "paymentMonths", value: "2026-04" },
    ]);
  });

  it("builds tab-switch fields without a duplicate tab field", () => {
    expect(
      buildEmployeeCashFlowFilterFieldEntries({
        companyId: "comp_1",
        month: "2026-04",
        tab: "saved",
        employeeIds: ["emp_1"],
        paymentMonths: ["2026-04"],
        includeTab: false,
      }),
    ).toEqual([
      { name: "companyId", value: "comp_1" },
      { name: "month", value: "2026-04" },
      { name: "employeeIds", value: "emp_1" },
      { name: "paymentMonths", value: "2026-04" },
    ]); 
  });

  it("builds dashboard filter fields while letting view and period buttons stay unique", () => {
    expect(
      buildDashboardFilterFieldEntries({
        companyId: "comp_1",
        periodType: "monthly",
        view: "employee",
        employeeIds: ["emp_1", "emp_2"],
        paymentMonths: ["2026-04"],
        allEmployees: true,
        allMonths: false,
        includeView: false,
      }),
    ).toEqual([
      { name: "companyId", value: "comp_1" },
      { name: "periodType", value: "monthly" },
      { name: "employeeIds", value: "emp_1" },
      { name: "employeeIds", value: "emp_2" },
      { name: "paymentMonths", value: "2026-04" },
      { name: "allEmployees", value: "1" },
    ]);
  });

  it("can omit stale dashboard all-selected flags from filter-apply forms", () => {
    expect(
      buildDashboardFilterFieldEntries({
        companyId: "comp_1",
        periodType: "monthly",
        view: "employee",
        allEmployees: true,
        allMonths: true,
        includeEmployeeIds: false,
        includePaymentMonths: false,
        includeAllEmployees: false,
        includeAllMonths: false,
      }),
    ).toEqual([
      { name: "companyId", value: "comp_1" },
      { name: "periodType", value: "monthly" },
      { name: "view", value: "employee" },
    ]);
  });

  it("omits stale employee and month selections from period filter load forms", () => {
    expect(
      buildDashboardFilterFieldEntries({
        companyId: "comp_1",
        periodType: "monthly",
        view: "period",
        employeeIds: ["emp_1", "emp_2"],
        paymentMonths: ["2026-04", "2026-05"],
        allEmployees: true,
        allMonths: true,
        includeEmployeeIds: false,
        includePaymentMonths: false,
        includeAllEmployees: false,
        includeAllMonths: false,
      }),
    ).toEqual([
      { name: "companyId", value: "comp_1" },
      { name: "periodType", value: "monthly" },
      { name: "view", value: "period" },
    ]);
  });

  it("labels full, empty, and partial checklist selections", () => {
    expect(
      getChecklistFilterTriggerLabel({
        label: "employee",
        selectedCount: 3,
        optionCount: 3,
      }),
    ).toBe("All");
    expect(
      getChecklistFilterTriggerLabel({
        label: "employee",
        selectedCount: 0,
        optionCount: 0,
      }),
    ).toBe("No employees");
    expect(
      getChecklistFilterTriggerLabel({
        label: "employee",
        selectedCount: 1,
        optionCount: 3,
      }),
    ).toBe("1 selected");
    expect(
      getChecklistFilterTriggerLabel({
        label: "employee",
        selectedCount: 2,
        optionCount: 3,
      }),
    ).toBe("2 selected");
  });

  it("mirrors selected values into hidden inputs and expands all values when select all is checked", () => {
    const { container } = render(
      createElement(
        "form",
        null,
        createElement(ChecklistFilterDropdown, {
          name: "employeeIds",
          label: "employee",
          options: [
            { value: "emp_1", label: "Asha" },
            { value: "emp_2", label: "Ben" },
          ],
          defaultSelectedValues: ["emp_1"],
          includeSelectAll: true,
        }),
      ),
    );

    expect(
      [...container.querySelectorAll('input[type="hidden"][name="employeeIds"]')].map(
        (input) => (input as HTMLInputElement).value,
      ),
    ).toEqual(["emp_1"]);

    fireEvent.click(screen.getByRole("button", { name: /employee/i }));
    fireEvent.click(screen.getByLabelText("Select all"));

    expect(
      [...container.querySelectorAll('input[type="hidden"][name="employeeIds"]')].map(
        (input) => (input as HTMLInputElement).value,
      ),
    ).toEqual(["emp_1", "emp_2"]);
  });

  it("raises checklist dropdown stacking when the panel is open", () => {
    const { container } = render(
      createElement(ChecklistFilterDropdown, {
        name: "employeeIds",
        label: "employee",
        options: [
          { value: "emp_1", label: "Asha" },
          { value: "emp_2", label: "Ben" },
        ],
        defaultSelectedValues: ["emp_1"],
        includeSelectAll: true,
      }),
    );

    const trigger = container.querySelector("button");
    if (!(trigger instanceof HTMLButtonElement)) {
      throw new Error("Expected checklist trigger button.");
    }

    fireEvent.click(trigger);

    const root = container.firstElementChild;
    const panel = container.querySelector('[role="group"][aria-label="employee filters"]');
    if (!(panel instanceof HTMLDivElement)) {
      throw new Error("Expected checklist filter panel.");
    }

    expect(root?.className).toContain("z-50");
    expect(panel.className).toContain("z-[100]");
  });
});
