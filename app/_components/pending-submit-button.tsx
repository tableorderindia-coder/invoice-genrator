"use client";

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { useFormStatus } from "react-dom";

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
      style={
        effectiveDisabled
          ? { opacity: 0.6, cursor: "not-allowed", ...style }
          : style
      }
    >
      {pending ? pendingText ?? defaultText : defaultText}
    </button>
  );
}
