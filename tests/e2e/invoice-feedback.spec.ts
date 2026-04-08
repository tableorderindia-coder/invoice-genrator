import { test, expect } from "@playwright/test";

test("shows inline success feedback on the draft invoice page", async ({ page }) => {
  await page.goto("http://localhost:3000/invoices/create");

  await page.getByLabel("Invoice number").fill(`AUTO-${Date.now()}`);
  await page.getByLabel("Billing date").fill("2026-04-07");
  await page.getByLabel("Due date").fill("2026-04-30");
  await page.locator('select[name="selectedTeamNames"]').selectOption(["data"]);

  await page.getByRole("button", { name: "Create draft" }).click();
  await page.waitForURL(/\/invoices\/drafts\//);

  await page.getByPlaceholder("Name").first().fill("Playwright Member");
  await page.locator('input[name="rateUsd"]').first().fill("25");
  await page.locator('input[name="hours"]').first().fill("4");
  await expect(page.getByLabel("Onboarding advance total")).toHaveValue("100.00");
  await page.getByRole("button", { name: "Add onboarding advance" }).click();

  await expect(page.getByText("Adjustment added.")).toBeVisible();
});
