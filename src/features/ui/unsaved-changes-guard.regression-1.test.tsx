// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UnsavedChangesGuard } from "@/app/_components/unsaved-changes-guard";

// Regression: ISSUE-001 - saving a dirty mutation form triggered the unload warning
// Found by /qa on 2026-08-03
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-08-03.md
describe("UnsavedChangesGuard accepted mutation submission", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("clears dirty state synchronously before an accepted POST unloads", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <>
        <UnsavedChangesGuard />
        <form data-unsaved-form method="post">
          <input aria-label="Company name" defaultValue="Original" />
          <button type="submit">Save</button>
        </form>
      </>,
    );

    fireEvent.change(screen.getByLabelText("Company name"), {
      target: { value: "Changed" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Save" }).closest("form")!);

    expect(
      window.dispatchEvent(
        new CustomEvent("eassyonboard:before-navigation", { cancelable: true }),
      ),
    ).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });
});
