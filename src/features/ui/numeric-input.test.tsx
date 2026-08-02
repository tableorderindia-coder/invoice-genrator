// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NumericInput, normalizeNumericInput } from "@/app/_components/numeric-input";

describe("NumericInput", () => {
  it("replaces a prefilled decimal value after Ctrl+A", () => {
    render(<NumericInput aria-label="Amount" defaultValue="85.00" precision={2} />);
    const input = screen.getByRole("textbox", { name: "Amount" });

    fireEvent.focus(input);
    input.setSelectionRange(0, input.getAttribute("value")?.length ?? 0);
    fireEvent.change(input, { target: { value: "125000" } });

    expect(input).toHaveValue("125000");
  });

  it("keeps an intermediate decimal while typing and removes forced trailing zeros on blur", () => {
    render(<NumericInput aria-label="Rate" defaultValue="12.00" precision={2} />);
    const input = screen.getByRole("textbox", { name: "Rate" });

    fireEvent.change(input, { target: { value: "12." } });
    expect(input).toHaveValue("12.");

    fireEvent.change(input, { target: { value: "12.50" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("12.5");
  });

  it("does not change its value for arrow or wheel input", () => {
    const onValueChange = vi.fn();
    render(
      <NumericInput
        aria-label="Peg rate"
        defaultValue="85"
        precision={4}
        onValueChange={onValueChange}
      />,
    );
    const input = screen.getByRole("textbox", { name: "Peg rate" });

    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.wheel(input, { deltaY: -100 });

    expect(input).toHaveValue("85");
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("normalizeNumericInput", () => {
  it("normalizes values without appending zeroes and enforces precision", () => {
    expect(normalizeNumericInput("00125.500", { precision: 2 })).toEqual({
      value: "125.5",
      error: null,
    });
    expect(normalizeNumericInput("12.345", { precision: 2 }).error).toBe(
      "Use no more than 2 decimal places.",
    );
  });
});
