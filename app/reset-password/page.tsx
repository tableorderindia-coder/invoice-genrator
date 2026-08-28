import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth/server";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login?next=/reset-password");
  }

  return <ResetPasswordForm />;
}
