type EnvShape = Record<string, string | undefined>;

export function getSupabaseBrowserCredentials(env: EnvShape) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

export function getSupabaseServerCredentials(env: EnvShape) {
  const browserCredentials = getSupabaseBrowserCredentials(env);
  const secretKey = env.SUPABASE_SECRET_KEY;

  if (!browserCredentials) {
    return null;
  }

  return {
    url: browserCredentials.url,
    key: secretKey ?? browserCredentials.key,
  };
}

export function getSupabaseMode(env: EnvShape) {
  return getSupabaseBrowserCredentials(env) ? "supabase" : "unconfigured";
}
