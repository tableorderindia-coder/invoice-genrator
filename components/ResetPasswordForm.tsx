"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { changePasswordAction } from "@/lib/auth/actions";
import PasswordInput from "@/components/PasswordInput";

const inputClassName =
  "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200";

const inputStyle = {
  background: "#1F2937",
  borderColor: "#374151",
  color: "#E5E7EB",
} as const;

export function ResetPasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    const result = await changePasswordAction(password);
    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    router.push(result.redirectTo);
    router.refresh();
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{ background: "#0B0F19" }}
    >
      <section
        className="w-full max-w-md rounded-[28px] border p-6 shadow-2xl sm:p-8"
        style={{
          background: "#111827",
          borderColor: "#374151",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }}
      >
        {error ? (
          <p className="mb-4 text-sm" style={{ color: "#FCA5A5" }}>
            {error}
          </p>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="reset-password">
            New password
          </label>
          <PasswordInput
            id="reset-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={12}
            autoComplete="new-password"
            placeholder="New Password"
            className={inputClassName}
            style={inputStyle}
          />

          <label className="sr-only" htmlFor="reset-confirm-password">
            Confirm password
          </label>
          <PasswordInput
            id="reset-confirm-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={12}
            autoComplete="new-password"
            placeholder="Confirm Password"
            className={inputClassName}
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200"
            style={{
              background: "#6366F1",
              color: "#E5E7EB",
              opacity: isSubmitting ? 0.7 : 1,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {isSubmitting ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>
    </main>
  );
}
