import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { getSupabaseBrowserCredentials } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const credentials = getSupabaseBrowserCredentials(process.env);

  return (
    <ResetPasswordForm
      supabaseUrl={credentials?.url ?? null}
      supabaseKey={credentials?.key ?? null}
    />
  );
}
