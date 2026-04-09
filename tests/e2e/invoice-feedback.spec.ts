import { test, expect } from "@playwright/test";

test("shows inline success feedback on the draft invoice page", async ({ page }) => {
  test.setTimeout(120000);
  const stamp = Date.now();
  const companyName = `Playwright Co ${stamp}`;
  const teamName = `Data Team ${stamp}`;
  const employeeName = `Playwright Employee ${stamp}`;
  const invoiceNumber = `AUTO-${stamp}`;

  await page.goto("http://localhost:3000/companies");
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Billing address").fill("123 Test Street, Surat");
  await page
    .getByLabel("Default note")
    .fill("Adjusted according to 52 weeks i.e. (hours/week * 52)/12.");
  await page.getByRole("button", { name: "Save company" }).click();
  await expect(page.getByText(companyName)).toBeVisible();

  await page.goto("http://localhost:3000/employees");
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

  await page.goto("http://localhost:3000/invoices/create");
  await page.getByLabel("Company").selectOption({ label: companyName });
  await page.getByLabel("Invoice number").fill(invoiceNumber);
  await page.getByLabel("Billing date").fill("2026-04-07");
  await page.getByLabel("Due date").fill("2026-04-30");
  await page.locator('select[name="selectedTeamNames"]').selectOption([teamName]);

  await page.getByRole("button", { name: "Create draft" }).click();
  await page.waitForURL(/\/invoices\/drafts\//);

  await page.locator('select[name="type"]').selectOption("onboarding");
  await expect(page.getByLabel("Employee")).toBeVisible();
  await page.getByLabel("Employee").selectOption({ label: employeeName });
  await expect(page.getByLabel("Rate ($/hr)")).toBeVisible();
  await expect(page.getByLabel("Hrs per week")).toBeVisible();
  await expect(page.getByLabel("Total")).toBeVisible();
  await page.getByLabel("Rate ($/hr)").fill("25");
  await page.getByLabel("Hrs per week").fill("4");
  await expect(page.getByLabel("Total")).toHaveValue("$433.33");
  await page.getByRole("button", { name: "Add / Update" }).click();

  await expect(page.getByText("Adjustment added.")).toBeVisible();
  await expect(
    page.getByText(`${employeeName} · $25.00/hr · 4 hrs/week`),
  ).toBeVisible();

  await page.locator('select[name="type"]').selectOption("onboarding");
  await page.getByLabel("Employee").selectOption({ label: employeeName });
  await page.getByLabel("Rate ($/hr)").fill("25");
  await page.getByLabel("Hrs per week").fill("4");
  await page.getByRole("button", { name: "Add / Update" }).click();

  await expect(page.getByText("Duplicate adjustment already added.")).toBeVisible();

  await page.locator('select[name="type"]').selectOption("reimbursement");
  await expect(page.getByLabel("Type / Label")).toBeVisible();
  await expect(page.getByLabel("Amount")).toBeVisible();
  await expect(
    page.getByPlaceholder("Enter expense type (e.g., travel, food)"),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Enter amount")).toBeVisible();

  await page
    .locator("div")
    .filter({ hasText: `${employeeName} · $25.00/hr · 4 hrs/week` })
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(page.getByText("Adjustment removed.")).toBeVisible();

  await page.getByRole("button", { name: "Mark generated" }).click();
  await page.waitForURL(/\/invoices/);

  await page.goto("http://localhost:3000/cashout");
  const cashoutRow = page.locator("tr", { hasText: invoiceNumber });
  await expect(cashoutRow).toBeVisible();

  await cashoutRow.getByLabel("Dollar inbound (USD)").fill("4300.00");
  await cashoutRow.getByLabel("USD/INR rate").fill("83.2500");
  await cashoutRow.getByRole("button", { name: "Mark cashout" }).click();

  await expect(page.getByText("Invoice marked as cashed out.")).toBeVisible();
  await expect(page.locator("tr", { hasText: invoiceNumber })).toHaveCount(0);

  await page.goto("http://localhost:3000/employee-payout");
  const payoutInvoiceOption = page
    .locator('select[name="invoiceId"] option')
    .filter({ hasText: invoiceNumber })
    .first();
  const payoutInvoiceValue = await payoutInvoiceOption.getAttribute("value");
  expect(payoutInvoiceValue).toBeTruthy();
  await page.getByLabel("Select cashed-out invoice").selectOption(String(payoutInvoiceValue));
  await page.getByRole("button", { name: "Load invoice employees" }).click();
  await expect(page.locator("tr", { hasText: employeeName })).toBeVisible();

  const payoutRow = page.locator("tr", { hasText: employeeName });
  await payoutRow.getByPlaceholder("Enter paid rate").fill("82.1000");
  await payoutRow.getByRole("button", { name: "Update" }).click();
  await expect(page.getByText("Employee payout updated.")).toBeVisible();
});
