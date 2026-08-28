"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { loginAction } from "@/lib/auth/actions";
import PasswordInput from "@/components/PasswordInput";
import {
  RiveCharacter,
  type RiveCharacterHandle,
} from "@/components/RiveCharacter";

type LoginFormProps = {
  initialError?: string;
  initialSuccess?: string;
  next?: string;
};

const inputClassName =
  "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200";

const inputStyle = {
  background: "#1F2937",
  borderColor: "#374151",
  color: "#E5E7EB",
} as const;

export function LoginForm({ initialError, initialSuccess, next }: LoginFormProps) {
  const router = useRouter();
  const riveRef = useRef<RiveCharacterHandle>(null);

  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [success, setSuccess] = useState(initialSuccess ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);

      const result = await loginAction(formData);

      if (!result.ok) {
        riveRef.current?.fireFail();
        setError(result.error);
        return;
      }

      riveRef.current?.fireSuccess();
      router.push(next || result.redirectTo);
      router.refresh();
    } catch {
      riveRef.current?.fireFail();
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="mb-5 space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.24em]" style={{ color: "#9CA3AF" }}>
            EassyOnboard Console
          </p>
          <h1 className="text-2xl font-semibold" style={{ color: "#F9FAFB" }}>
            Login
          </h1>
        </div>

        <h2 className="mb-4 text-center text-xl font-semibold text-white">
          EasyOnboard Console Login
        </h2>

        <RiveCharacter ref={riveRef} />

        <div className="mt-5 space-y-4">
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

          {mode === "login" ? (
            <>
              <form className="space-y-4" onSubmit={handleLogin}>
                <label className="sr-only" htmlFor="login-email">
                  Email
                </label>
                <input
                  id="login-email"
                  value={email}
                  onFocus={() => riveRef.current?.setChecking(true)}
                  onBlur={() => riveRef.current?.setChecking(false)}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    riveRef.current?.updateLook(event.target.value);
                  }}
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Email"
                  className={inputClassName}
                  style={inputStyle}
                />

                <label className="sr-only" htmlFor="login-password">
                  Password
                </label>
                <PasswordInput
                  id="login-password"
                  value={password}
                  onFocus={() => riveRef.current?.setHandUp(true)}
                  onBlur={() => riveRef.current?.setHandUp(false)}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Password"
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
                  {isSubmitting ? "Logging in..." : "Login"}
                </button>
              </form>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setMode("forgot");
                }}
                className="w-full text-sm transition-colors duration-200"
                style={{
                  color: "#E5E7EB",
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                Forgot Password?
              </button>
            </>
          ) : (
            <div className="w-full space-y-4">
              <p className="text-sm" style={{ color: "#E5E7EB" }}>
                Password resets are handled by your admin. Ask them to set a new
                temporary password for your account from Admin &rarr; Users - you&apos;ll
                be prompted to choose a new password the next time you log in.
              </p>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setMode("login");
                }}
                className="w-full text-sm transition-colors duration-200"
                style={{ color: "#E5E7EB" }}
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
