import type { AuthContext } from "@/lib/auth/server";

type OverviewPreferenceContext = Pick<AuthContext, "supabase" | "userId">;

export async function loadOverviewAdvancePreference(
  context: OverviewPreferenceContext,
) {
  try {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("overview_exclude_onboarding_advance_from_net_pl")
      .eq("id", context.userId)
      .maybeSingle();

    if (!error) {
      return {
        excludeAdvanceDeduction: Boolean(
          data?.overview_exclude_onboarding_advance_from_net_pl,
        ),
        loadFailed: false,
      };
    }
  } catch {
    // The Overview must remain usable when the preference cannot be reached.
  }

  return { excludeAdvanceDeduction: false, loadFailed: true };
}
