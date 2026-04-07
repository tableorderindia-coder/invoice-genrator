import { test, expect } from "@playwright/test";

test("shows inline success feedback on the draft invoice page", async ({ page }) => {
  await page.goto("http://localhost:3000/invoices/create");

  await page.getByLabel("Invoice number").fill(`AUTO-${Date.now()}`);
  await page.getByLabel("Billing date").fill("2026-04-07");
  await page.getByLabel("Due date").fill("2026-04-30");
  await page.locator('select[name="selectedTeamNames"]').selectOption(["data"]);

  await page.getByRole("button", { name: "Create draft" }).click();
  await page.waitForURL(/\/invoices\/drafts\//);

  await page.locator('textarea[name="noteText"]').fill("Updated from Playwright e2e.");
  await page.getByRole("button", { name: "Save note" }).click();

  await expect(page.getByText("Invoice note saved.")).toBeVisible();
});
