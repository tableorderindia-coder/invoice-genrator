import { expect, test } from "@playwright/test";

test("loads dashboard and employee cash flow routes", async ({ page }) => {
  test.setTimeout(120000);

  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "P/N Dashboard" }),
  ).toBeVisible();
  await expect(page.getByText("Company profitability")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Load company" }),
  ).toBeVisible();

  await page.goto("/employee-cash-flow");
  await expect(
    page.getByRole("heading", { name: "Employee Cash Flow" }),
  ).toBeVisible();
  await expect(page.getByText("Cash reality dashboard")).toBeVisible();
  await expect(page.getByRole("button", { name: "Load month" })).toBeVisible();
});
