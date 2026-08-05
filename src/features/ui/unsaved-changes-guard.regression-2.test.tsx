// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UnsavedChangesGuard } from "@/app/_components/unsaved-changes-guard";

// Regression: ISSUE-001 - hydrated Next server actions looked like cancelled submissions
// Found by /qa on 2026-08-03
// Report: .gstack/qa-reports/qa-report-127-0-0-1-2026-08-03.md
describe("UnsavedChangesGuard hydrated server action submission", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("clears dirty state when React handles a Next server action", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <>
        <UnsavedChangesGuard />
        <form
          data-unsaved-form
          method="post"
          onSubmit={(event) => event.preventDefault()}
        >
          <input type="hidden" name="$ACTION_ID_test" />
          <input aria-label="Employee name" defaultValue="Original" />
          <button type="submit">Save</button>
        </form>
      </>,
    );

    fireEvent.change(screen.getByLabelText("Employee name"), {
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

  it("does not keep dirty state when client validation blocks a server action", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <>
        <UnsavedChangesGuard />
        <form
          data-unsaved-form
          method="post"
          onSubmit={(event) => {
            event.currentTarget.dataset.unsavedSubmitBlocked = "true";
            event.preventDefault();
          }}
        >
          <input type="hidden" name="$ACTION_ID_test" />
          <input aria-label="Adjustment amount" defaultValue="100" />
          <button type="submit">Add</button>
        </form>
      </>,
    );

    fireEvent.change(screen.getByLabelText("Adjustment amount"), {
      target: { value: "200" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Add" }).closest("form")!);

    expect(
      window.dispatchEvent(
        new CustomEvent("eassyonboard:before-navigation", { cancelable: true }),
      ),
    ).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });
});
