import { redirect } from "next/navigation";

import { getDefaultRedirectPath } from "@/lib/auth/authorization";
import { getAuthContext } from "@/lib/auth/server";
import { getSupabaseBrowserCredentials } from "@/lib/supabase/config";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    success?: string | string[];
    next?: string | string[];
  }>;
}) {
  const context = await getAuthContext();
  if (context) {
    redirect(
      getDefaultRedirectPath({
        role: context.profile.role,
        permissions: context.permissions,
        mustChangePassword: context.profile.mustChangePassword,
      }),
    );
  }

  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const success = Array.isArray(params.success) ? params.success[0] : params.success;
  const next = Array.isArray(params.next) ? params.next[0] : params.next;
  const credentials = getSupabaseBrowserCredentials(process.env);

  return (
    <LoginForm
      initialError={error}
      initialSuccess={success}
      next={next}
      supabaseUrl={credentials?.url ?? null}
      supabaseKey={credentials?.key ?? null}
    />
  );
}
