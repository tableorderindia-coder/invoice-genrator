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
  await page.getByPlaceholder("Enter onboarding advance name").fill("Playwright Member");
  await page.getByPlaceholder("Enter onboarding $/hour").fill("25");
  await page.getByPlaceholder("Enter onboarding hours").fill("4");
  await expect(page.getByLabel("Adjustment total")).toHaveValue("$100.00");
  await page.getByRole("button", { name: "Add / Update" }).click();

  await expect(page.getByText("Adjustment added.")).toBeVisible();
  await expect(page.getByText("Playwright Member")).toBeVisible();

  await page.locator('select[name="type"]').selectOption("onboarding");
  await page.getByPlaceholder("Enter onboarding advance name").fill("Playwright Member");
  await page.getByPlaceholder("Enter onboarding $/hour").fill("25");
  await page.getByPlaceholder("Enter onboarding hours").fill("4");
  await page.getByRole("button", { name: "Add / Update" }).click();

  await expect(page.getByText("Duplicate adjustment already added.")).toBeVisible();

  await page
    .locator("div")
    .filter({ hasText: "Playwright Member · $25.00/hr · 4 hrs" })
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(page.getByText("Adjustment removed.")).toBeVisible();
});
