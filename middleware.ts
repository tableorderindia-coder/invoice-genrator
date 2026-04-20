import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseServerCredentials } from "@/lib/supabase/config";
import { getDefaultRedirectPath, shouldForcePasswordReset } from "@/lib/auth/authorization";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/reset-password"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const credentials = getSupabaseServerCredentials(process.env);
  if (!credentials) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(credentials.url, credentials.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
        }

        response = NextResponse.next({
          request,
        });

        for (const cookie of cookiesToSet) {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isPublicPath(pathname)) {
      return response;
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search || ""}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  if (isPublicPath(pathname)) {
    if (pathname === "/reset-password" || pathname.startsWith("/reset-password/")) {
      return response;
    }

    const redirectUrl = new URL(
      getDefaultRedirectPath({
        role: profile?.role ?? "user",
        permissions: [],
        mustChangePassword: profile?.must_change_password ?? false,
      }),
      request.url,
    );

    return NextResponse.redirect(redirectUrl);
  }

  if (
    profile &&
    shouldForcePasswordReset({
      mustChangePassword: profile.must_change_password,
      pathname,
    })
  ) {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
