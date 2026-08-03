// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UnsavedChangesGuard } from "@/app/_components/unsaved-changes-guard";

describe("UnsavedChangesGuard", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("blocks portal navigation when a marked form is dirty and discard is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
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
    const navigationEvent = new CustomEvent("eassyonboard:before-navigation", {
      cancelable: true,
    });

    expect(window.dispatchEvent(navigationEvent)).toBe(false);
    expect(window.confirm).toHaveBeenCalledWith("Discard unsaved changes?");
  });

  it("keeps dirty state when client validation cancels a submission", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <>
        <UnsavedChangesGuard />
        <form data-unsaved-form onSubmit={(event) => event.preventDefault()}>
          <input aria-label="Employee name" defaultValue="Original" />
          <button type="submit">Save</button>
        </form>
      </>,
    );

    fireEvent.change(screen.getByLabelText("Employee name"), {
      target: { value: "Changed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const navigationEvent = new CustomEvent("eassyonboard:before-navigation", {
      cancelable: true,
    });
    expect(window.dispatchEvent(navigationEvent)).toBe(false);
    expect(window.confirm).toHaveBeenCalledWith("Discard unsaved changes?");
  });

  it("clears dirty state after an accepted submission", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<UnsavedChangesGuard />);
    const form = document.createElement("form");
    form.dataset.unsavedForm = "true";
    form.method = "post";
    const input = document.createElement("input");
    form.append(input);
    document.body.append(form);
    fireEvent.input(input, { target: { value: "Changed" } });
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    confirm.mockClear();

    expect(
      window.dispatchEvent(
        new CustomEvent("eassyonboard:before-navigation", { cancelable: true }),
      ),
    ).toBe(true);
    expect(window.confirm).not.toHaveBeenCalled();
    form.remove();
  });

  it("guards ordinary page links and GET navigation forms", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { container } = render(
      <>
        <UnsavedChangesGuard />
        <form data-unsaved-form>
          <input aria-label="Company name" defaultValue="Original" />
        </form>
        <a href="/employees">Employees</a>
        <form action="/dashboard" method="get">
          <button type="submit">Monthly view</button>
        </form>
      </>,
    );

    fireEvent.change(screen.getByLabelText("Company name"), {
      target: { value: "Changed" },
    });
    expect(fireEvent.click(screen.getByRole("link", { name: "Employees" }))).toBe(false);
    expect(
      fireEvent.submit(container.querySelector("form[action='/dashboard']")!),
    ).toBe(false);
    expect(window.confirm).toHaveBeenCalledTimes(2);
  });

  it("guards browser history traversal through the Navigation API", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const navigation = new EventTarget();
    Object.defineProperty(window, "navigation", {
      configurable: true,
      value: navigation,
    });
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
    const traverse = new Event("navigate", { cancelable: true });
    Object.defineProperty(traverse, "navigationType", { value: "traverse" });
    Object.defineProperty(traverse, "canIntercept", { value: true });
    const intercept = vi.fn();
    Object.defineProperty(traverse, "intercept", { value: intercept });

    navigation.dispatchEvent(traverse);
    expect(intercept).toHaveBeenCalledTimes(1);
    const [{ precommitHandler }] = intercept.mock.calls[0] as [
      { precommitHandler: () => Promise<never> },
    ];
    await expect(precommitHandler()).rejects.toMatchObject({ name: "AbortError" });
    expect(window.confirm).toHaveBeenCalledWith("Discard unsaved changes?");
    delete (window as Window & { navigation?: EventTarget }).navigation;
  });

  it("ignores changes in forms that are not marked for guarding", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <>
        <UnsavedChangesGuard />
        <form>
          <input aria-label="Filter" defaultValue="one" />
        </form>
      </>,
    );

    fireEvent.change(screen.getByLabelText("Filter"), { target: { value: "two" } });
    expect(
      window.dispatchEvent(
        new CustomEvent("eassyonboard:before-navigation", { cancelable: true }),
      ),
    ).toBe(true);
    expect(window.confirm).not.toHaveBeenCalled();
  });
});
