// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/employees",
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () =>
    new URLSearchParams("tab=edit&companyIds=company_1&employeeId=employee_1"),
}));

import { Shell, buildCompanyScopeHref } from "../../../app/_components/shell";

const companies = [
  { id: "company_1", name: "Company One" },
  { id: "company_2", name: "Company Two" },
];

describe("buildCompanyScopeHref", () => {
  it("switches to one company while preserving non-company filters", () => {
    expect(
      buildCompanyScopeHref({
        pathname: "/employees",
        persistentSearchFields: [
          ["tab", "edit"],
          ["companyIds", "company_1"],
          ["employeeId", "employee_1"],
        ],
        companyOptions: companies,
        companyIds: ["company_2"],
      }),
    ).toBe("/employees?tab=edit&employeeId=employee_1&companyIds=company_2");
  });

  it("uses the clean route for all companies", () => {
    expect(
      buildCompanyScopeHref({
        pathname: "/employees",
        persistentSearchFields: [
          ["companyId", "company_1"],
          ["companyIds", "company_1"],
        ],
        companyOptions: companies,
        companyIds: ["company_1", "company_2"],
      }),
    ).toBe("/employees");
  });

  it("commits company selector changes to the generated URL", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      assign,
    });

    render(
      <Shell
        title="Employees"
        companyOptions={companies}
        activeCompanyIds={["company_1"]}
      >
        <div>Employee content</div>
      </Shell>,
    );

    fireEvent.change(screen.getAllByLabelText("Active company")[0], {
      target: { value: "company_2" },
    });

    expect(assign).toHaveBeenCalledWith(
      "/employees?tab=edit&employeeId=employee_1&companyIds=company_2",
    );
  });
});
