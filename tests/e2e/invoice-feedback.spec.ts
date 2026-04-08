import { test, expect } from "@playwright/test";

test("shows inline success feedback on the draft invoice page", async ({ page }) => {
  await page.goto("http://localhost:3000/invoices/create");

  await page.getByLabel("Invoice number").fill(`AUTO-${Date.now()}`);
  await page.getByLabel("Billing date").fill("2026-04-07");
  await page.getByLabel("Due date").fill("2026-04-30");
  await page.locator('select[name="selectedTeamNames"]').selectOption(["data"]);

  await page.getByRole("button", { name: "Create draft" }).click();
  await page.waitForURL(/\/invoices\/drafts\//);

  await page.locator('select[name="type"]').selectOption("onboarding");
  await expect(page.getByLabel("Name")).toBeVisible();
  await expect(page.getByLabel("Rate ($/hr)")).toBeVisible();
  await expect(page.getByLabel("Hours")).toBeVisible();
  await expect(page.getByLabel("Total")).toBeVisible();
  await page.getByLabel("Name").fill("Playwright Member");
  await page.getByLabel("Rate ($/hr)").fill("25");
  await page.getByLabel("Hours").fill("4");
  await expect(page.getByLabel("Total")).toHaveValue("$100.00");
  await page.getByRole("button", { name: "Add / Update" }).click();

  await expect(page.getByText("Adjustment added.")).toBeVisible();
  await expect(page.getByText("Playwright Member")).toBeVisible();

  await page.locator('select[name="type"]').selectOption("onboarding");
  await page.getByLabel("Name").fill("Playwright Member");
  await page.getByLabel("Rate ($/hr)").fill("25");
  await page.getByLabel("Hours").fill("4");
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
    .filter({ hasText: "Playwright Member · $25.00/hr · 4 hrs" })
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(page.getByText("Adjustment removed.")).toBeVisible();
});
