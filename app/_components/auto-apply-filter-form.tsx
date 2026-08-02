"use client";

import { LoaderCircle } from "lucide-react";
import {
  useEffect,
  useRef,
  useTransition,
  type FormEvent,
  type FormHTMLAttributes,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export type AutoApplyFilterFormProps = Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "action" | "children" | "onChange" | "onSubmit"
> & {
  action: string;
  children: ReactNode;
  debounceMs?: number;
  pendingLabel?: string;
  scroll?: boolean;
};

function buildFilterHref(action: string, form: HTMLFormElement) {
  const url = new URL(action, window.location.origin);
  const currentUrl = new URL(window.location.href);
  const params =
    url.pathname === currentUrl.pathname
      ? new URLSearchParams(currentUrl.search)
      : new URLSearchParams(url.search);

  const controlledNames = new Set(
    Array.from(form.elements)
      .map((element) => (element as HTMLInputElement).name)
      .filter(Boolean),
  );
  for (const name of controlledNames) params.delete(name);

  for (const [name, value] of new FormData(form)) {
    if (typeof value === "string") params.append(name, value);
  }

  const query = params.toString();
  return `${url.pathname}${query ? `?${query}` : ""}`;
}

export function AutoApplyFilterForm({
  action,
  children,
  debounceMs = 300,
  pendingLabel = "Updating...",
  scroll = false,
  ...formProps
}: AutoApplyFilterFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<number | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(
    () => {
      const cancelScheduledApply = () => {
        if (timerRef.current !== null) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
          return true;
        }
        return false;
      };
      const cancelForNavigation = (event: Event) => {
        if (!cancelScheduledApply()) return;
        window.queueMicrotask(() => {
          if (event.defaultPrevented) formRef.current?.reset();
        });
      };
      window.addEventListener("eassyonboard:before-navigation", cancelForNavigation);
      window.addEventListener("eassyonboard:before-ui-switch", cancelForNavigation);
      return () => {
        cancelScheduledApply();
        window.removeEventListener("eassyonboard:before-navigation", cancelForNavigation);
        window.removeEventListener("eassyonboard:before-ui-switch", cancelForNavigation);
      };
    },
    [],
  );

  const apply = () => {
    const form = formRef.current;
    if (!form || !form.checkValidity()) return;

    const beforeNavigation = new CustomEvent("eassyonboard:before-navigation", {
      cancelable: true,
    });
    if (!window.dispatchEvent(beforeNavigation)) {
      form.reset();
      return;
    }

    const href = buildFilterHref(action, form);
    const currentHref = `${window.location.pathname}${window.location.search}`;
    if (href === currentHref) {
      return;
    }

    startTransition(() => router.replace(href, { scroll }));
  };

  const scheduleApply = (delay: number) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (delay === 0) {
      apply();
      return;
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      apply();
    }, delay);
  };

  const handleChange = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    if (target.dataset.autoApply === "false") return;
    const delayed = target instanceof HTMLInputElement &&
      (target.type === "month" || target.type === "date");
    scheduleApply(delayed ? debounceMs : 0);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const alreadyPrevented = event.defaultPrevented || event.nativeEvent.defaultPrevented;
    event.preventDefault();
    if (alreadyPrevented) return;
    scheduleApply(0);
  };

  return (
    <form
      {...formProps}
      ref={formRef}
      action={action}
      aria-busy={pending}
      data-auto-apply-filter-form
      onChange={handleChange}
      onSubmit={handleSubmit}
    >
      {children}
      <span
        aria-live="polite"
        className="inline-flex min-h-5 items-center gap-1.5 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        {pending ? (
          <>
            <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
            {pendingLabel}
          </>
        ) : null}
      </span>
    </form>
  );
}
