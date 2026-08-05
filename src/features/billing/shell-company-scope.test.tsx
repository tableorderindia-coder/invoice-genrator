// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/employees",
  useRouter: () => ({
    push: routerPush,
  }),
  useSearchParams: () =>
    new URLSearchParams("tab=edit&companyIds=company_1&employeeId=employee_1"),
}));

import { Shell, buildCompanyScopeHref } from "../../../app/_components/shell";
import { SidebarPreferenceProvider } from "../../../app/_components/sidebar-preference-provider";

const companies = [
  { id: "company_1", name: "Company One" },
  { id: "company_2", name: "Company Two" },
];

describe("buildCompanyScopeHref", () => {
  beforeEach(() => {
    cleanup();
    routerPush.mockClear();
    document.documentElement.dataset.uiMode = "saas";
    document.documentElement.dataset.sidebarCollapsed = "false";
    document.cookie = "eassyonboard_sidebar_collapsed=; Max-Age=0; Path=/";
  });

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

  it("commits company checkbox changes to the generated URL", () => {
    const assign = vi.fn();
    vi.stubGlobal("location", {
      ...window.location,
      assign,
    });
    const companyOptions = [...companies, { id: "company_3", name: "Company Three" }];

    render(
      <Shell
        title="Employees"
        companyOptions={companyOptions}
        activeCompanyIds={["company_1"]}
      >
        <div>Employee content</div>
      </Shell>,
    );

    fireEvent.click(screen.getAllByLabelText("Company Two")[0]);

    expect(assign).toHaveBeenCalledWith(
      "/employees?tab=edit&employeeId=employee_1&companyIds=company_1&companyIds=company_2",
    );
  });

  it("keeps the compact navigation in normal flow while scrolling", () => {
    const { container } = render(
      <Shell title="Employees" companyOptions={companies} activeCompanyIds={["company_1"]}>
        <div>Employee content</div>
      </Shell>,
    );

    expect(container.querySelector("header")).not.toHaveClass("sticky");
  });

  it("links the SaaS brand to the scoped Overview route", () => {
    render(
      <Shell title="Employees" companyOptions={companies} activeCompanyIds={["company_1"]}>
        <div>Employee content</div>
      </Shell>,
    );

    const brandLinks = screen.getAllByRole("link", { name: "EassyOnboard Overview" });
    expect(brandLinks[0]).toHaveAttribute("href", "/?companyIds=company_1");
    fireEvent.click(brandLinks[0]);
    expect(routerPush).toHaveBeenCalledWith("/?companyIds=company_1");
  });

  it("collapses the desktop sidebar, persists the choice, and exposes icon tooltips", async () => {
    render(
      <SidebarPreferenceProvider initialCollapsed={false}>
        <Shell title="Employees" companyOptions={companies} activeCompanyIds={["company_1"]}>
          <div>Employee content</div>
        </Shell>
      </SidebarPreferenceProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Minimize sidebar" }));

    const sidebar = screen.getByTestId("desktop-sidebar");
    expect(sidebar).toHaveClass("is-collapsed");
    expect(document.cookie).toContain("eassyonboard_sidebar_collapsed=1");
    expect(document.documentElement.dataset.sidebarCollapsed).toBe("true");

    const employeesLink = within(sidebar).getByRole("link", { name: "Employees" });
    fireEvent.mouseEnter(employeesLink);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Employees");
    fireEvent.mouseLeave(employeesLink);
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });

  it("uses an anchored company popover when the desktop sidebar is collapsed", () => {
    render(
      <SidebarPreferenceProvider initialCollapsed>
        <Shell title="Employees" companyOptions={companies} activeCompanyIds={["company_1"]}>
          <div>Employee content</div>
        </Shell>
      </SidebarPreferenceProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change active company" }));
    const popover = screen.getByRole("dialog", { name: "Choose active company" });
    expect(within(popover).getByLabelText("Financial year")).toBeTruthy();
    expect(within(popover).getByLabelText("All companies")).toBeTruthy();
    expect(within(popover).getByLabelText("Company One")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Choose active company" })).toBeNull();
  });

  it("opens SaaS mobile navigation as an off-canvas sidebar and restores focus on Escape", () => {
    render(
      <Shell title="Employees" companyOptions={companies} activeCompanyIds={["company_1"]}>
        <div>Employee content</div>
      </Shell>,
    );

    const trigger = screen.getByRole("button", { name: "Open navigation sidebar" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Portal navigation" })).toHaveAttribute(
      "aria-modal",
      "true",
    );
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.queryByRole("button", { name: "Open account and navigation menu" })).toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Portal navigation" })).toBeNull();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes the mobile sidebar after successful navigation", () => {
    render(
      <Shell title="Employees" companyOptions={companies} activeCompanyIds={["company_1"]}>
        <div>Employee content</div>
      </Shell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open navigation sidebar" }));
    const drawer = screen.getByRole("dialog", { name: "Portal navigation" });
    fireEvent.click(within(drawer).getByRole("link", { name: "Dashboard" }));

    expect(routerPush).toHaveBeenCalledWith("/dashboard?companyIds=company_1");
    expect(screen.queryByRole("dialog", { name: "Portal navigation" })).toBeNull();
  });

  it("keeps the existing Legacy navigation presentation isolated", () => {
    document.documentElement.dataset.uiMode = "legacy";

    render(
      <Shell title="Employees" companyOptions={companies} activeCompanyIds={["company_1"]}>
        <div>Employee content</div>
      </Shell>,
    );

    expect(screen.queryByTestId("desktop-sidebar")).toBeNull();
    expect(screen.queryByRole("button", { name: "Minimize sidebar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Open navigation sidebar" })).toBeNull();
    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(1);
  });
});
