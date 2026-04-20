"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

import {
  getDefaultRedirectPath,
  normalizePermissionPage,
  type AppPermission,
} from "@/lib/auth/authorization";

type ResetPasswordFormProps = {
  supabaseUrl: string | null;
  supabaseKey: string | null;
};

type ProfileRow = {
  role: "admin" | "user";
  must_change_password: boolean;
};

type PermissionRow = {
  page: string;
  can_view: boolean;
  can_edit: boolean;
};

const inputClassName =
  "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200";

const inputStyle = {
  background: "#1F2937",
  borderColor: "#374151",
  color: "#E5E7EB",
} as const;

export function ResetPasswordForm({
  supabaseUrl,
  supabaseKey,
}: ResetPasswordFormProps) {
  const router = useRouter();
  const configError = !supabaseUrl || !supabaseKey ? "Supabase is not configured." : "";
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) {
      return null;
    }

    return createBrowserClient(supabaseUrl, supabaseKey);
  }, [supabaseKey, supabaseUrl]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(Boolean(supabase));
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    const resolveUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      setUserId(user?.id ?? null);
      setIsCheckingSession(false);
      if (!user) {
        setError("Invalid or expired reset link");
      }
    };

    void resolveUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setIsCheckingSession(false);
      if (session?.user) {
        setError("");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!supabase || !userId) {
      setError("Invalid or expired reset link");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", userId);

    const [{ data: profile }, { data: permissionRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("role, must_change_password")
        .eq("id", userId)
        .single<ProfileRow>(),
      supabase
        .from("permissions")
        .select("page, can_view, can_edit")
        .eq("user_id", userId),
    ]);

    const permissions: AppPermission[] =
      ((permissionRows ?? []) as PermissionRow[])
        .map((permission) => {
          const page = normalizePermissionPage(permission.page);
          if (!page) {
            return null;
          }

          return {
            page,
            canView: permission.can_view,
            canEdit: permission.can_edit,
          } satisfies AppPermission;
        })
        .filter((permission): permission is AppPermission => permission !== null);

    router.push(
      getDefaultRedirectPath({
        role: profile?.role ?? "user",
        permissions,
        mustChangePassword: false,
      }),
    );
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
        ) : configError ? (
          <p className="mb-4 text-sm" style={{ color: "#FCA5A5" }}>
            {configError}
          </p>
        ) : null}

        {isCheckingSession ? (
          <p className="text-sm" style={{ color: "#E5E7EB" }}>
            Loading...
          </p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="reset-password">
              New password
            </label>
            <input
              id="reset-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
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
            <input
              id="reset-confirm-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              placeholder="Confirm Password"
              className={inputClassName}
              style={inputStyle}
            />

            <button
              type="submit"
              disabled={isSubmitting || !userId}
              className="w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200"
              style={{
                background: "#6366F1",
                color: "#E5E7EB",
                opacity: isSubmitting || !userId ? 0.7 : 1,
                cursor: isSubmitting || !userId ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
