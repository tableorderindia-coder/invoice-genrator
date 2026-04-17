import type { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span
        className="mb-2 block text-sm font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

/** Shared className string for dark-themed form inputs */
export const inputClass =
  "w-full min-w-0 rounded-2xl border px-4 py-3 text-sm leading-5";
