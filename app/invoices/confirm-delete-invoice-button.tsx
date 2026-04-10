"use client";

import { useState } from "react";

type ConfirmDeleteInvoiceButtonProps = {
  className?: string;
  message: string;
};

export function ConfirmDeleteInvoiceButton({
  className,
  message,
}: ConfirmDeleteInvoiceButtonProps) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }

        if (!window.confirm(message)) {
          event.preventDefault();
          return;
        }

        setPending(true);
      }}
      style={pending ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
    >
      {pending ? "Deleting..." : "Delete invoice"}
    </button>
  );
}

