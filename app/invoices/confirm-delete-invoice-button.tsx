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
      type="button"
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (pending) {
          return;
        }

        if (!window.confirm(message)) {
          return;
        }

        const targetForm = event.currentTarget.form;
        if (targetForm instanceof HTMLFormElement) {
          targetForm.requestSubmit();
          setPending(true);
        }
      }}
      style={pending ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
    >
      {pending ? "Deleting..." : "Delete invoice"}
    </button>
  );
}
