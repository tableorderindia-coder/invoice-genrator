import { createServerClient } from "@supabase/ssr";

import { getSupabaseServerCredentials } from "./config";

export async function createSupabaseServerClient() {
  const credentials = getSupabaseServerCredentials(process.env);

  if (!credentials) {
    return null;
  }

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return createServerClient(credentials.url, credentials.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // Server Components can read cookies but cannot always write them.
          // Middleware handles session refreshes for those requests.
        }
      },
    },
  });
}
