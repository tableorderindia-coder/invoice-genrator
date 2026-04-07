import { createClient } from "@supabase/supabase-js";
import { getSupabaseServerCredentials } from "./config";

export function createSupabaseServerClient() {
  const credentials = getSupabaseServerCredentials(process.env);

  if (!credentials) {
    return null;
  }

  return createClient(credentials.url, credentials.key, {
    auth: {
      persistSession: false,
    },
  });
}
