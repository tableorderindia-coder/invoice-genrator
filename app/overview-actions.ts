"use server";

import { requirePageAccess } from "@/lib/auth/server";

export type OverviewPreferenceActionResult =
  | { ok: true }
  | { ok: false; message: string };

export async function saveOverviewAdvancePreferenceAction(
  excludeAdvanceDeduction: boolean,
): Promise<OverviewPreferenceActionResult> {
  const context = await requirePageAccess("overview");
  if (typeof excludeAdvanceDeduction !== "boolean") {
    return { ok: false, message: "Could not save the Overview preference." };
  }

  try {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        overview_exclude_onboarding_advance_from_net_pl: excludeAdvanceDeduction,
      })
      .eq("id", context.userId);

    if (!error) {
      return { ok: true };
    }
  } catch {
    // The client can throw for transport failures in addition to returning an error.
  }

  return { ok: false, message: "Could not save the Overview preference." };
}
