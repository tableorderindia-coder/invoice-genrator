import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { query } from "@/lib/db/pool";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

// Node.js APIs (node:crypto in session.ts, `pg` sockets in lib/db/pool.ts)
// aren't available on the default Edge middleware runtime, so this opts
// into the Node.js middleware runtime (stable since Next.js 15.2) instead -
// same per-request DB lookup the old Supabase-JS middleware did via fetch,
// just over a real TCP connection.
export const runtime = "nodejs";

const PUBLIC_PATHS = ["/login"];
const PASSWORD_RESET_ALLOWED_PATHS = ["/reset-password", "/logout"];

function shouldForcePasswordReset(input: {
  mustChangePassword: boolean;
  pathname: string;
}) {
  if (!input.mustChangePassword) {
    return false;
  }

  return !PASSWORD_RESET_ALLOWED_PATHS.some((path) =>
    input.pathname.startsWith(path),
  );
}

function getDefaultRedirectPath(input: {
  role: "admin" | "user";
  mustChangePassword: boolean;
}) {
  if (input.mustChangePassword) {
    return "/reset-password";
  }

  if (input.role === "admin") {
    return "/admin/users";
  }

  return "/dashboard";
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);

  if (!session) {
    if (isPublicPath(pathname) || pathname.startsWith("/reset-password")) {
      // /reset-password itself still requires a session (checked by
      // changePasswordAction/getAuthContext) - there is no more
      // unauthenticated "reset link" flow, but redirecting here would just
      // bounce to /login anyway, so let the page render its own guard.
      if (pathname.startsWith("/reset-password")) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search || ""}`);
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search || ""}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  const { rows } = await query<{ role: "admin" | "user"; must_change_password: boolean }>(
    `select role, must_change_password from public.profiles where id = $1`,
    [session.sub],
  );
  const profile = rows[0];

  if (isPublicPath(pathname)) {
    const redirectUrl = new URL(
      getDefaultRedirectPath({
        role: profile?.role ?? "user",
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
