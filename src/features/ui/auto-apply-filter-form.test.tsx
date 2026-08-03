// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AutoApplyFilterForm } from "@/app/_components/auto-apply-filter-form";
import { ChecklistFilterDropdown } from "@/app/_components/checklist-filter-dropdown";

const { replaceMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe("AutoApplyFilterForm", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    window.history.replaceState({}, "", "/dashboard");
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("applies a select immediately and preserves duplicate query parameters", async () => {
    window.history.replaceState(
      {},
      "",
      "/dashboard?view=employee&flash=keep&employeeId=employee_1",
    );
    const { container } = render(
      <AutoApplyFilterForm action="/dashboard">
        <input type="hidden" name="companyIds" value="company_1" />
        <input type="hidden" name="companyIds" value="company_2" />
        <select aria-label="Employee" name="employeeId" defaultValue="employee_1">
          <option value="employee_1">Employee one</option>
          <option value="employee_2">Employee two</option>
        </select>
      </AutoApplyFilterForm>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Employee" }), {
      target: { value: "employee_2" },
    });

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        "/dashboard?view=employee&flash=keep&companyIds=company_1&companyIds=company_2&employeeId=employee_2",
        { scroll: false },
      );
    });
    expect(container.querySelector("form")).toHaveAttribute("aria-busy", "false");
    expect(screen.queryByText("Updating...")).not.toBeInTheDocument();
  });

  it("debounces month changes for 300 milliseconds", () => {
    vi.useFakeTimers();
    render(
      <AutoApplyFilterForm action="/salary">
        <input aria-label="Salary month" name="month" type="month" defaultValue="2026-06" />
      </AutoApplyFilterForm>,
    );

    fireEvent.change(screen.getByLabelText("Salary month"), {
      target: { value: "2026-07" },
    });

    act(() => vi.advanceTimersByTime(299));
    expect(replaceMock).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(replaceMock).toHaveBeenCalledWith("/salary?month=2026-07", { scroll: false });
  });

  it("cancels navigation and restores native controls when unsaved work blocks it", () => {
    const blockNavigation = (event: Event) => event.preventDefault();
    window.addEventListener("eassyonboard:before-navigation", blockNavigation);

    render(
      <AutoApplyFilterForm action="/employees">
        <select aria-label="Employee" name="employeeId" defaultValue="employee_1">
          <option value="employee_1">Employee one</option>
          <option value="employee_2">Employee two</option>
        </select>
      </AutoApplyFilterForm>,
    );

    const select = screen.getByRole("combobox", { name: "Employee" });
    fireEvent.change(select, { target: { value: "employee_2" } });

    expect(replaceMock).not.toHaveBeenCalled();
    expect(select).toHaveValue("employee_1");
    window.removeEventListener("eassyonboard:before-navigation", blockNavigation);
  });

  it("does not navigate when an earlier submit guard cancels submission", () => {
    const cancelSubmit = (event: Event) => event.preventDefault();
    document.addEventListener("submit", cancelSubmit, true);

    const { container } = render(
      <AutoApplyFilterForm action="/dashboard">
        <input name="view" value="employee" readOnly />
      </AutoApplyFilterForm>,
    );

    fireEvent.submit(container.querySelector("form")!);
    expect(replaceMock).not.toHaveBeenCalled();
    document.removeEventListener("submit", cancelSubmit, true);
  });

  it("cancels a pending debounce when another navigation begins", () => {
    vi.useFakeTimers();
    render(
      <AutoApplyFilterForm action="/salary">
        <input aria-label="Salary month" name="month" type="month" defaultValue="2026-06" />
      </AutoApplyFilterForm>,
    );

    fireEvent.change(screen.getByLabelText("Salary month"), {
      target: { value: "2026-07" },
    });
    window.dispatchEvent(
      new CustomEvent("eassyonboard:before-navigation", { cancelable: true }),
    );
    act(() => vi.advanceTimersByTime(300));

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("restores a debounced control when the competing navigation is cancelled", async () => {
    vi.useFakeTimers();
    render(
      <AutoApplyFilterForm action="/salary">
        <input aria-label="Salary month" name="month" type="month" defaultValue="2026-06" />
      </AutoApplyFilterForm>,
    );
    const blockNavigation = (event: Event) => event.preventDefault();
    window.addEventListener("eassyonboard:before-navigation", blockNavigation);
    const month = screen.getByLabelText("Salary month");

    fireEvent.change(month, { target: { value: "2026-07" } });
    window.dispatchEvent(
      new CustomEvent("eassyonboard:before-navigation", { cancelable: true }),
    );
    await act(async () => Promise.resolve());
    act(() => vi.advanceTimersByTime(300));

    expect(month).toHaveValue("2026-06");
    expect(replaceMock).not.toHaveBeenCalled();
    window.removeEventListener("eassyonboard:before-navigation", blockNavigation);
  });

  it("applies checklist selections once when the menu closes", async () => {
    render(
      <>
        <AutoApplyFilterForm action="/dashboard">
          <ChecklistFilterDropdown
            name="employeeIds"
            label="Employee"
            options={[
              { value: "employee_1", label: "Employee one" },
              { value: "employee_2", label: "Employee two" },
            ]}
            defaultSelectedValues={["employee_1"]}
            autoApplyOnClose
          />
        </AutoApplyFilterForm>
        <button type="button">Outside</button>
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Employee/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Employee two" }));
    expect(replaceMock).not.toHaveBeenCalled();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledTimes(1);
      expect(replaceMock).toHaveBeenCalledWith(
        "/dashboard?employeeIds=employee_1&employeeIds=employee_2",
        { scroll: false },
      );
    });
  });

  it("does not apply when a checklist closes without changes", async () => {
    render(
      <>
        <AutoApplyFilterForm action="/dashboard">
          <ChecklistFilterDropdown
            name="employeeIds"
            label="Employee"
            options={[{ value: "employee_1", label: "Employee one" }]}
            defaultSelectedValues={["employee_1"]}
            autoApplyOnClose
          />
        </AutoApplyFilterForm>
        <button type="button">Outside</button>
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Employee/i }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));

    await act(async () => Promise.resolve());
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
