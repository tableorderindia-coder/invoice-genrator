"use server";

import { requirePageAccess } from "@/lib/auth/server";
import { query } from "@/lib/db/pool";

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
    await query(
      `update public.profiles
       set overview_exclude_onboarding_advance_from_net_pl = $1
       where id = $2`,
      [excludeAdvanceDeduction, context.userId],
    );
    return { ok: true };
  } catch {
    // The client can throw for transport/query failures.
  }

  return { ok: false, message: "Could not save the Overview preference." };
}
