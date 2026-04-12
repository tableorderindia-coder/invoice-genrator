import { test, expect } from "@playwright/test";

test("shows inline success feedback on the draft invoice page", async ({ page }) => {
  test.setTimeout(120000);
  const stamp = Date.now();
  const companyName = `Playwright Co ${stamp}`;
  const updatedCompanyName = `${companyName} Updated`;
  const teamName = `Data Team ${stamp}`;
  const employeeName = `Playwright Employee ${stamp}`;
  const extraEmployeeName = `Playwright Extra Employee ${stamp}`;
  const invoiceNumber = `AUTO-${stamp}`;
  const editedInvoiceNumber = `${invoiceNumber}-EDIT`;

  await page.goto("/companies");
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Billing address").fill("123 Test Street, Surat");
  await page
    .getByLabel("Default note")
    .fill("Adjusted according to 52 weeks i.e. (hours/week * 52)/12.");
  await page.getByRole("button", { name: "Save company" }).click();
  await expect(page.getByText(companyName)).toBeVisible();

  await page.goto("/employees");
  await page.getByLabel("Company").selectOption({ label: companyName });
  await page.getByLabel("Name").fill(employeeName);
  await page.getByLabel("Designation").fill("QA Analyst");
  await page.getByLabel("Default team").fill(teamName);
  await page.getByLabel("Billing rate (USD/hr)").fill("25");
  await page.getByLabel("Payout $/month").fill("3000");
  await page.getByLabel("Hrs per week").fill("40");
  await page.getByLabel("Active from").fill("2026-04-01");
  await page.getByRole("button", { name: "Save employee" }).click();
  await expect(page.getByText(employeeName)).toBeVisible();

  await page.getByLabel("Company").selectOption({ label: companyName });
  await page.getByLabel("Name").fill(extraEmployeeName);
  await page.getByLabel("Designation").fill("Account Specialist");
  await page.getByLabel("Default team").fill(`Finance Team ${stamp}`);
  await page.getByLabel("Billing rate (USD/hr)").fill("35");
  await page.getByLabel("Payout $/month").fill("2600");
  await page.getByLabel("Hrs per week").fill("35");
  await page.getByLabel("Active from").fill("2026-04-01");
  await page.getByRole("button", { name: "Save employee" }).click();
  await expect(page.getByText(extraEmployeeName)).toBeVisible();

  await page.goto("/invoices/create");
  await page.getByLabel("Company").selectOption({ label: companyName });
  await page.getByLabel("Invoice number").fill(invoiceNumber);
  await page.getByLabel("Billing date").fill("2026-04-07");
  await page.getByLabel("Due date").fill("2026-04-30");
  await page.locator('select[name="selectedTeamNames"]').selectOption([teamName]);

  await page.getByRole("button", { name: "Create draft" }).click();
  await page.waitForURL(/\/invoices\/drafts\//);
  await expect(page.getByLabel("Company name")).toBeVisible();
  await expect(page.getByLabel("Invoice number")).toBeVisible();
  await expect(page.getByLabel("Billing month")).toBeVisible();
  await expect(page.getByLabel("Billing year")).toBeVisible();
  await expect(page.getByLabel("Billing date")).toBeVisible();
  await expect(page.getByLabel("Due date")).toBeVisible();
  await expect(page.getByLabel("Status")).toBeVisible();
  await page.getByLabel("Company name").fill(updatedCompanyName);
  await page.getByLabel("Invoice number").fill(editedInvoiceNumber);
  await page.getByLabel("Billing date").fill("2026-04-08");
  await page.getByLabel("Due date").fill("2026-05-02");
  await page.getByLabel("Status").selectOption("generated");
  await page.getByRole("button", { name: "Save header" }).click();
  await page.waitForURL(/flashStatus=success/, { timeout: 15000 });
  await expect(page.getByText("Invoice header updated.")).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel("Company name")).toHaveValue(updatedCompanyName);
  await expect(page.getByLabel("Invoice number")).toHaveValue(editedInvoiceNumber);
  await expect(page.getByText("Billing 04-08-2026 · Due 05-02-2026")).toBeVisible();
  const adjustmentSidebarScroll = page.getByTestId("adjustment-sidebar-scroll");
  await expect(adjustmentSidebarScroll).toBeVisible();

  await page.locator('select[name="type"]').selectOption("onboarding");
  await expect(page.getByLabel("Employee")).toBeVisible();
  await page.getByLabel("Employee").selectOption({ label: employeeName });
  await expect(page.getByLabel("Rate ($/hr)")).toBeVisible();
  await expect(page.getByLabel("Hrs per week")).toBeVisible();
  await expect(page.getByLabel("Total")).toBeVisible();
  await page.getByLabel("Rate ($/hr)").fill("25");
  await page.getByLabel("Hrs per week").fill("4");
  await page.getByLabel("Number of days to advance").fill("30");
  await expect(page.getByLabel("Total")).toHaveValue("433");
  await page.getByRole("button", { name: "Add / Update" }).click();
  await page.waitForURL(/flashStatus=success/, { timeout: 15000 });

  await expect(page.getByText("Adjustment added.")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(`${employeeName} · $25/hr · 4 hrs/week`)).toBeVisible({
    timeout: 15000,
  });
  await expect(
    adjustmentSidebarScroll
      .locator("button")
      .filter({ hasText: "Remove" })
      .first(),
  ).toBeVisible();

  await page.locator('select[name="type"]').selectOption("onboarding");
  await page.getByLabel("Employee").selectOption({ label: employeeName });
  await page.getByLabel("Rate ($/hr)").fill("25");
  await page.getByLabel("Hrs per week").fill("4");
  await page.getByLabel("Number of days to advance").fill("30");
  await page.getByRole("button", { name: "Add / Update" }).click();

  await expect(page.getByText("Duplicate adjustment already added.")).toBeVisible({
    timeout: 15000,
  });

  await page.locator('select[name="type"]').selectOption("reimbursement");
  await expect(page.getByLabel("Employee (optional)")).toBeVisible();
  await page.getByLabel("Employee (optional)").selectOption({ label: employeeName });
  await expect(page.getByLabel("Type / Label")).toBeVisible();
  await expect(page.getByLabel("Total")).toBeVisible();
  await expect(
    page.getByPlaceholder("Enter expense type (e.g., laptop, signing bonus)"),
  ).toBeVisible();
  await page.getByLabel("Type / Label").fill("Laptop");
  await page.getByLabel("Total").fill("800");
  await page.getByRole("button", { name: "Add / Update" }).click();
  await page.waitForURL(/flashStatus=success/, { timeout: 15000 });
  await expect(page.getByText("Adjustment added.")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(`${employeeName} · Laptop`)).toBeVisible({ timeout: 15000 });

  await page.locator('select[name="type"]').selectOption("reimbursement");
  await page.getByLabel("Employee (optional)").selectOption("");
  await page.getByLabel("Type / Label").fill("Office snacks");
  await page.getByLabel("Total").fill("200");
  await page.getByRole("button", { name: "Add / Update" }).click();
  await page.waitForURL(/flashStatus=success/, { timeout: 15000 });
  await expect(page.getByText("Office snacks")).toBeVisible({ timeout: 15000 });

  await page.locator('select[name="type"]').selectOption("appraisal");
  await page.getByLabel("Employee").selectOption({ label: employeeName });
  await page.getByLabel("Total").fill("650");
  await page.getByRole("button", { name: "Add / Update" }).click();
  await page.waitForURL(/flashStatus=success/, { timeout: 15000 });
  await expect(
    page.getByRole("paragraph").filter({ hasText: `${employeeName} · $25/hr · 40 hrs/week` }),
  ).toBeVisible({ timeout: 15000 });

  await page
    .locator("div")
    .filter({ has: page.getByRole("heading", { name: "Onboarding Advance" }) })
    .getByRole("button", { name: "Remove", exact: true })
    .first()
    .click();
  await page.waitForURL(/flashStatus=success/, { timeout: 15000 });
  await expect(page.getByText("Adjustment removed.")).toBeVisible({ timeout: 15000 });

  await page.goto("/invoices");
  await expect(page.locator("tr", { hasText: editedInvoiceNumber })).toContainText("04-08-2026");

  await page.goto("/cashout");
  const cashoutRow = page.locator("tr", { hasText: editedInvoiceNumber });
  await expect(cashoutRow).toBeVisible();

  await cashoutRow.getByLabel("Dollar inbound (USD)").fill("4300.00");
  await cashoutRow.getByLabel("USD/INR rate").fill("83.2500");
  await cashoutRow.getByRole("button", { name: "Mark cashout" }).click();

  await expect(page.getByText("Invoice marked as cashed out.")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("tr", { hasText: editedInvoiceNumber })).toHaveCount(0);

  await page.goto("/invoices");
  const cashedOutInvoiceRow = page.locator("tr", { hasText: editedInvoiceNumber });
  await expect(cashedOutInvoiceRow).toBeVisible();
  await expect(cashedOutInvoiceRow).toContainText("cashed out");
  await expect(cashedOutInvoiceRow).toContainText("04-08-2026");

  await page.goto("/employee-cash-flow");
  await page.getByLabel("Company").selectOption({ label: updatedCompanyName });
  const cashFlowInvoiceOption = page
    .locator('select[name="invoiceId"] option')
    .filter({ hasText: editedInvoiceNumber })
    .first();
  const cashFlowInvoiceValue = await cashFlowInvoiceOption.getAttribute("value");
  expect(cashFlowInvoiceValue).toBeTruthy();
  await page
    .getByLabel("Cashed-out invoice")
    .selectOption(String(cashFlowInvoiceValue));
  await page.getByRole("button", { name: "Load" }).click();
  await expect(page.getByRole("heading", { name: employeeName })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator('input[value="Laptop"]')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('input[value="800.00"]')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('input[value="650.00"]')).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Save employee cash flow rows" }).click();
  await page.waitForURL(/flashStatus=success/, { timeout: 15000 });
  await expect(page.getByText("Employee cash flow rows saved.")).toBeVisible({
    timeout: 15000,
  });

  await page.goto("/dashboard");
  await page.getByLabel("Select company").selectOption({ label: updatedCompanyName });
  await page.getByRole("button", { name: "Load company" }).click();
  const employeeSection = page.locator("div").filter({ hasText: employeeName }).first();
  await expect(employeeSection.getByText("Laptop")).toBeVisible({ timeout: 15000 });
  await expect(employeeSection).toContainText("800");
  await expect(employeeSection).toContainText("650");
  await page.getByRole("button", { name: "Monthly / Yearly" }).click();
  const monthlyRow = page.locator("tr", { hasText: "April 2026" }).first();
  await expect(monthlyRow).toContainText("1,000");
  await expect(monthlyRow).toContainText("650");

  await page.goto("/employee-payout");
  const payoutInvoiceOption = page
    .locator('select[name="invoiceId"] option')
    .filter({ hasText: editedInvoiceNumber })
    .first();
  const payoutInvoiceValue = await payoutInvoiceOption.getAttribute("value");
  expect(payoutInvoiceValue).toBeTruthy();
  await page.getByLabel("Select cashed-out invoice").selectOption(String(payoutInvoiceValue));
  await page.getByRole("button", { name: "Load invoice employees" }).click();
  await expect(page.locator("tr", { hasText: employeeName })).toBeVisible();

  await page.locator('select[name="employeeId"]').selectOption({ label: extraEmployeeName });
  await page.getByRole("button", { name: "+ Add employee" }).click();
  await expect(page.getByText("Employee added to payout list.")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("tr", { hasText: extraEmployeeName })).toBeVisible({ timeout: 15000 });
  await page
    .locator("tr", { hasText: extraEmployeeName })
    .getByRole("button", { name: "Remove" })
    .click();
  await expect(page.getByText("Employee payout removed.")).toBeVisible({ timeout: 15000 });
  await expect(page.locator("tr", { hasText: extraEmployeeName })).toHaveCount(0);

  const payoutRow = page.locator("tr", { hasText: employeeName });
  await payoutRow.getByPlaceholder("Enter paid rate").fill("82.1000");
  await payoutRow.getByRole("button", { name: "Update" }).click();
  await expect(page.getByText("Employee payout updated.")).toBeVisible({ timeout: 15000 });
});
