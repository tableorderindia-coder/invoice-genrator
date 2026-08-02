"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";

type PendingActionButtonProps = {
  className?: string;
  defaultText: ReactNode;
  pendingText?: ReactNode;
  disabled?: boolean;
  form?: string;
  style?: CSSProperties;
};

export function PendingActionButton({
  className,
  defaultText,
  pendingText,
  disabled = false,
  form,
  style,
}: PendingActionButtonProps) {
  const [pending, setPending] = useState(false);
  const effectiveDisabled = disabled || pending;

  return (
    <button
      type="button"
      className={className}
      disabled={effectiveDisabled}
      aria-busy={pending}
      onClick={(event) => {
        if (!effectiveDisabled) {
          const targetForm = form
            ? document.getElementById(form)
            : event.currentTarget.form;
          if (targetForm instanceof HTMLFormElement) {
            targetForm.requestSubmit();
            setPending(true);
          }
        }
      }}
      style={
        effectiveDisabled
          ? { opacity: 0.6, cursor: "not-allowed", ...style }
          : style
      }
    >
      <span className="inline-flex min-w-max items-center justify-center gap-2">
        {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
        {pending ? pendingText ?? defaultText : defaultText}
      </span>
    </button>
  );
}
