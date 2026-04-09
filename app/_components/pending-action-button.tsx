"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

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
      type="submit"
      form={form}
      className={className}
      disabled={effectiveDisabled}
      onClick={() => {
        if (!effectiveDisabled) {
          setPending(true);
        }
      }}
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
