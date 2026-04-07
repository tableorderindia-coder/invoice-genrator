import { describe, expect, it } from "vitest";

import {
  getSupabaseBrowserCredentials,
  getSupabaseMode,
  getSupabaseServerCredentials,
} from "./config";

describe("supabase config", () => {
  it("uses publishable key when present", () => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
    };

    expect(getSupabaseBrowserCredentials(env)).toEqual({
      url: "https://example.supabase.co",
      key: "publishable",
    });
    expect(getSupabaseServerCredentials(env)).toEqual({
      url: "https://example.supabase.co",
      key: "publishable",
    });
    expect(getSupabaseMode(env)).toBe("supabase");
  });

  it("falls back to anon key and uses secret key on the server when provided", () => {
    expect(
      getSupabaseBrowserCredentials({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      key: "anon",
    });
    expect(
      getSupabaseServerCredentials({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
        SUPABASE_SECRET_KEY: "secret",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      key: "secret",
    });

    expect(
      getSupabaseMode({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toBe("unconfigured");
  });
});
