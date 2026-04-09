"use client";

import { PendingSubmitButton } from "@/app/_components/pending-submit-button";

export function CreateInvoiceSubmitButton() {
  return (
    <PendingSubmitButton
      className="gradient-btn mt-6"
      defaultText="Create draft"
      pendingText="Creating..."
    />
  );
}
