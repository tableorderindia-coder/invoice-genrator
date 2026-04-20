type EnvShape = Record<string, string | undefined>;

type SupabaseCredentials = {
  url: string;
  key: string;
};

export function getSupabaseBrowserCredentials(
  env: EnvShape,
): SupabaseCredentials | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

export function getSupabaseServerCredentials(
  env: EnvShape,
): SupabaseCredentials | null {
  return getSupabaseBrowserCredentials(env);
}

export function getSupabaseAdminCredentials(
  env: EnvShape,
): SupabaseCredentials | null {
  const browserCredentials = getSupabaseBrowserCredentials(env);
  const secretKey = env.SUPABASE_SECRET_KEY;

  if (!browserCredentials || !secretKey) {
    return null;
  }

  return {
    url: browserCredentials.url,
    key: secretKey,
  };
}

export function getSupabaseMode(env: EnvShape) {
  return getSupabaseBrowserCredentials(env) ? "supabase" : "unconfigured";
}
