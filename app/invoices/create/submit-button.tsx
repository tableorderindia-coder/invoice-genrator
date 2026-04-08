"use client";

import { useFormStatus } from "react-dom";

export function CreateInvoiceSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="gradient-btn mt-6"
      disabled={pending}
      style={pending ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
    >
      {pending ? "Creating..." : "Create draft"}
    </button>
  );
}
