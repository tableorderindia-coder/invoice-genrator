"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseBrowserCredentials } from "./config";

export function createSupabaseBrowserClient() {
  const credentials = getSupabaseBrowserCredentials(process.env);

  if (!credentials) {
    return null;
  }

  return createBrowserClient(credentials.url, credentials.key);
}
