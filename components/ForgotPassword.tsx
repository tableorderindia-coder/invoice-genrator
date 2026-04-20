"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type ForgotPasswordProps = {
  supabaseUrl: string | null;
  supabaseKey: string | null;
  onBack: () => void;
};

const inputClassName =
  "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200";

const inputStyle = {
  background: "#1F2937",
  borderColor: "#374151",
  color: "#E5E7EB",
} as const;

export function ForgotPassword({
  supabaseUrl,
  supabaseKey,
  onBack,
}: ForgotPasswordProps) {
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) {
      return null;
    }

    return createBrowserClient(supabaseUrl, supabaseKey);
  }, [supabaseKey, supabaseUrl]);

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setIsSubmitting(true);

    const response = await fetch("/api/auth/users/exists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      setError("Unable to verify user.");
      setIsSubmitting(false);
      return;
    }

    const payload = (await response.json()) as { exists?: boolean };

    if (!payload.exists) {
      setError("User not found");
      setIsSubmitting(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
      setIsSubmitting(false);
      return;
    }

    setSuccess("Magic link sent");
    setIsSubmitting(false);
  };

  return (
    <div className="w-full space-y-4">
      {error ? (
        <p className="text-sm" style={{ color: "#FCA5A5" }}>
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm" style={{ color: "#A7F3D0" }}>
          {success}
        </p>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="forgot-email">
          Email
        </label>
        <input
          id="forgot-email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
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
          {isSubmitting ? "Sending..." : "Send Magic Link"}
        </button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm transition-colors duration-200"
        style={{ color: "#E5E7EB" }}
      >
        Back to Login
      </button>
    </div>
  );
}
