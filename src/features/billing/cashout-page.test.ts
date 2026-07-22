import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readSource(path: string) {
  return readFileSync(resolve(projectRoot, path), "utf8");
}

describe("cashout page", () => {
  it("does not render a cashout date input", () => {
    const pageSource = readSource("app/cashout/page.tsx");

    expect(pageSource).not.toContain('name="realizedAt"');
    expect(pageSource).not.toContain('aria-label="Cashout date"');
    expect(pageSource).not.toContain("Cashout records settlement date");
  });

  it("renders clearly labelled dollar inward and rate inputs", () => {
    const pageSource = readSource("app/cashout/page.tsx");

    expect(pageSource).toContain('aria-label="Dollar inward (USD)"');
    expect(pageSource).toContain('placeholder="Dollar inward (USD)"');
    expect(pageSource).toContain('aria-label="USD/INR rate"');
    expect(pageSource).toContain('placeholder="USD/INR rate"');
  });
});
