import type { AuthContext } from "@/lib/auth/server";
import { query } from "@/lib/db/pool";

type OverviewPreferenceContext = Pick<AuthContext, "userId">;

export async function loadOverviewAdvancePreference(
  context: OverviewPreferenceContext,
) {
  try {
    const { rows } = await query<{
      overview_exclude_onboarding_advance_from_net_pl: boolean | null;
    }>(
      `select overview_exclude_onboarding_advance_from_net_pl
       from public.profiles
       where id = $1`,
      [context.userId],
    );

    return {
      excludeAdvanceDeduction: Boolean(
        rows[0]?.overview_exclude_onboarding_advance_from_net_pl,
      ),
      loadFailed: false,
    };
  } catch {
    // The Overview must remain usable when the preference cannot be reached.
  }

  return { excludeAdvanceDeduction: false, loadFailed: true };
}
