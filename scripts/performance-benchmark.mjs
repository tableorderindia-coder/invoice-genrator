import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BENCHMARK_BASE_URL ?? "http://localhost:3000";
const email = process.env.BENCHMARK_EMAIL;
const password = process.env.BENCHMARK_PASSWORD;
const outputPath =
  process.env.BENCHMARK_OUTPUT ??
  path.join("docs", "performance", `benchmark-${new Date().toISOString().slice(0, 10)}.json`);

const routes = [
  { name: "Overview", url: "/", visibleText: "P&L Summary" },
  { name: "Employees", url: "/employees", visibleText: "Employees" },
  { name: "Salary", url: "/salary", visibleText: "Salary" },
  { name: "Employee Cash Flow", url: "/employee-cash-flow", visibleText: "Employee Cash Flow" },
  { name: "Dashboard", url: "/dashboard", visibleText: "P/L Dashboard" },
  { name: "Invoices", url: "/invoices", visibleText: "Invoices" },
];

function now() {
  return Math.round(performance.now());
}

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  if (!email || !password) {
    return;
  }

  const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'));
  const passwordInput = page.getByLabel(/password/i).or(page.locator('input[type="password"]'));
  if ((await emailInput.count()) === 0 || (await passwordInput.count()) === 0) {
    return;
  }

  await emailInput.first().fill(email);
  await passwordInput.first().fill(password);
  await page.getByRole("button", { name: /sign in|login/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30000 });
}

async function measureRoute(page, route) {
  const requests = [];
  const errors = [];
  page.on("request", (request) => requests.push({ url: request.url(), method: request.method() }));
  page.on("requestfailed", (request) => {
    errors.push({
      url: request.url(),
      failure: request.failure()?.errorText ?? "request failed",
    });
  });
  page.on("pageerror", (error) => errors.push({ message: error.message }));

  const start = now();
  const response = await page.goto(`${baseUrl}${route.url}`, { waitUntil: "commit" });
  const routeCommitMs = now() - start;
  await page.waitForLoadState("domcontentloaded");
  const domReadyMs = now() - start;
  const responseEndMs = response
    ? Math.round(
        await page.evaluate(
          (url) => {
            const nav = performance
              .getEntriesByType("navigation")
              .find((entry) => entry.name === url);
            return nav ? nav.responseEnd : performance.now();
          },
          response.url(),
        ),
      )
    : null;

  const visibleStart = now();
  await page.getByText(route.visibleText, { exact: false }).first().waitFor({ timeout: 30000 });
  const firstDataVisibleMs = now() - start;

  return {
    name: route.name,
    url: route.url,
    status: response?.status() ?? null,
    routeCommitMs,
    domReadyMs,
    responseEndMs,
    firstDataVisibleMs,
    firstVisibleWaitMs: now() - visibleStart,
    requestCount: requests.length,
    failedRequests: errors,
  };
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await login(page);

  const results = [];
  for (const route of routes) {
    for (let run = 1; run <= 3; run += 1) {
      results.push({ run, ...(await measureRoute(page, route)) });
    }
  }

  await browser.close();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(
    outputPath,
    JSON.stringify({ baseUrl, measuredAt: new Date().toISOString(), results }, null, 2),
  );
  console.log(`Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
