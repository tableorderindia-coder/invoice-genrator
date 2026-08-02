// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChecklistFilterDropdown } from "@/app/_components/checklist-filter-dropdown";

const options = [
  { value: "one", label: "One" },
  { value: "two", label: "Two" },
];

afterEach(cleanup);

describe("ChecklistFilterDropdown", () => {
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
