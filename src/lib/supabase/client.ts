import { createClient } from "@supabase/supabase-js";
import { getSupabaseBrowserCredentials } from "./config";

export function createSupabaseBrowserClient() {
  const credentials = getSupabaseBrowserCredentials(process.env);

  if (!credentials) {
    return null;
  }

  return createClient(credentials.url, credentials.key);
}
