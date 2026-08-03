// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChecklistFilterDropdown } from "@/app/_components/checklist-filter-dropdown";

const options = [
  { value: "one", label: "One" },
  { value: "two", label: "Two" },
];

afterEach(cleanup);

describe("ChecklistFilterDropdown", () => {
  it("uses mode-aware surface classes instead of a hardcoded dark panel", () => {
    render(<ChecklistFilterDropdown name="items" label="Items" options={options} />);
    fireEvent.click(screen.getByRole("button", { name: /items/i }));

    const panel = screen.getByRole("group", { name: "Items filters" });
    expect(panel).toHaveClass("checklist-filter-panel");
    expect(panel).not.toHaveStyle({ background: "rgba(15, 17, 24, 0.98)" });

    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/\.checklist-filter-panel\s*\{[^}]*background:\s*var\(--popover-bg\)/s);
    expect(css).toMatch(/html\[data-ui-mode="saas"\]\s*\{[^}]*--popover-bg:\s*#ffffff/s);
  });

  it("closes when clicking outside and returns focus to the trigger", () => {
    render(
      <div>
        <ChecklistFilterDropdown name="items" label="Items" options={options} />
        <button type="button">Outside</button>
      </div>,
    );
    const trigger = screen.getByRole("button", { name: /items/i });
    fireEvent.click(trigger);
    expect(screen.getByRole("group", { name: "Items filters" })).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside" }));
    expect(screen.queryByRole("group", { name: "Items filters" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on Escape but remains open while selecting options", () => {
    render(<ChecklistFilterDropdown name="items" label="Items" options={options} />);
    const trigger = screen.getByRole("button", { name: /items/i });
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("checkbox", { name: "One" }));
    expect(screen.getByRole("group", { name: "Items filters" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("group", { name: "Items filters" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
