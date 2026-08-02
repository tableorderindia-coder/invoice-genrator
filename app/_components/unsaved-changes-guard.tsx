"use client";

import { useEffect } from "react";

const guardedFormSelector = "form[data-unsaved-form]";

function guardedFormFromEvent(event: Event) {
  return event.target instanceof Element
    ? event.target.closest<HTMLFormElement>(guardedFormSelector)
    : null;
}

export function UnsavedChangesGuard() {
  useEffect(() => {
    const dirtyForms = new Set<HTMLFormElement>();

    const hasDirtyForms = () => {
      for (const form of dirtyForms) {
        if (!form.isConnected) dirtyForms.delete(form);
      }
      return dirtyForms.size > 0;
    };

    const markDirty = (event: Event) => {
      const form = guardedFormFromEvent(event);
      if (form) dirtyForms.add(form);
    };
    const clearForm = (event: Event) => {
      const form = guardedFormFromEvent(event);
      if (form) dirtyForms.delete(form);
    };
    const clearSubmittedForm = (event: SubmitEvent) => {
      const form = guardedFormFromEvent(event);
      if (!form) return;
      if (!event.defaultPrevented) dirtyForms.delete(form);
    };
    const confirmDiscard = (event: Event) => {
      if (!hasDirtyForms()) return;
      if (!window.confirm("Discard unsaved changes?")) {
        event.preventDefault();
        return;
      }
      dirtyForms.clear();
    };
    const navigationIsAllowed = () =>
      window.dispatchEvent(
        new CustomEvent("eassyonboard:before-navigation", { cancelable: true }),
      );
    const requestNavigation = (event: Event) => {
      if (!navigationIsAllowed()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const guardLinkNavigation = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (
        !anchor ||
        anchor.target ||
        anchor.hasAttribute("download") ||
        anchor.dataset.navigationGuarded !== undefined
      ) {
        return;
      }
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      requestNavigation(event);
    };
    const guardGetFormNavigation = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (
        !form ||
        form.dataset.autoApplyFilterForm !== undefined ||
        form.method.toLowerCase() !== "get"
      ) {
        return;
      }
      requestNavigation(event);
    };
    const guardHistoryNavigation = (event: Event) => {
      const navigateEvent = event as Event & {
        navigationType?: string;
        canIntercept?: boolean;
        intercept?: (options: {
          precommitHandler: () => Promise<never>;
        }) => void;
      };
      if (navigateEvent.navigationType !== "traverse" || navigationIsAllowed()) return;
      if (navigateEvent.canIntercept && navigateEvent.intercept) {
        navigateEvent.intercept({
          precommitHandler: async () => {
            throw new DOMException("Unsaved changes were kept.", "AbortError");
          },
        });
      }
    };
    const browserNavigation = (
      window as Window & { navigation?: EventTarget }
    ).navigation;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (hasDirtyForms()) event.preventDefault();
    };

    document.addEventListener("input", markDirty, true);
    document.addEventListener("change", markDirty, true);
    document.addEventListener("click", guardLinkNavigation, true);
    document.addEventListener("submit", guardGetFormNavigation, true);
    document.addEventListener("submit", clearSubmittedForm);
    document.addEventListener("reset", clearForm, true);
    browserNavigation?.addEventListener("navigate", guardHistoryNavigation);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("eassyonboard:before-navigation", confirmDiscard);
    window.addEventListener("eassyonboard:before-ui-switch", confirmDiscard);

    return () => {
      document.removeEventListener("input", markDirty, true);
      document.removeEventListener("change", markDirty, true);
      document.removeEventListener("click", guardLinkNavigation, true);
      document.removeEventListener("submit", guardGetFormNavigation, true);
      document.removeEventListener("submit", clearSubmittedForm);
      document.removeEventListener("reset", clearForm, true);
      browserNavigation?.removeEventListener("navigate", guardHistoryNavigation);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("eassyonboard:before-navigation", confirmDiscard);
      window.removeEventListener("eassyonboard:before-ui-switch", confirmDiscard);
    };
  }, []);

  return null;
}
