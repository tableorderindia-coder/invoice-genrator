import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminCredentials } from "./config";

export function createSupabaseAdminClient() {
  const credentials = getSupabaseAdminCredentials(process.env);

  if (!credentials) {
    return null;
  }

  return createClient(credentials.url, credentials.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
