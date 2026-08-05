// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UnsavedChangesGuard } from "@/app/_components/unsaved-changes-guard";

describe("UnsavedChangesGuard", () => {
  it("does not show discard prompts or block navigation after edits", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <>
        <UnsavedChangesGuard />
        <form data-unsaved-form>
          <input aria-label="Company name" defaultValue="Original" />
        </form>
      </>,
    );

    fireEvent.change(screen.getByLabelText("Company name"), {
      target: { value: "Changed" },
    });

    expect(
      window.dispatchEvent(
        new CustomEvent("eassyonboard:before-navigation", { cancelable: true }),
      ),
    ).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });
});
