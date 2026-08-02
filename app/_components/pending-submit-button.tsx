"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

type PendingSubmitButtonProps = {
  defaultText: ReactNode;
  pendingText?: ReactNode;
  style?: CSSProperties;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type">;

export function PendingSubmitButton({
  defaultText,
  pendingText,
  disabled = false,
  style,
  ...buttonProps
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const effectiveDisabled = disabled || pending;

  return (
    <button
      type="submit"
      {...buttonProps}
      disabled={effectiveDisabled}
      aria-busy={pending}
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
