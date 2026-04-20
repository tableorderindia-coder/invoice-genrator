import { NextResponse } from "next/server";

import {
  canAccessPage,
  canEditPage,
  shouldForcePasswordReset,
  type AppPage,
} from "./authorization";
import { getAuthContext } from "./server";

export async function requireApiAccess(input: {
  page: AppPage;
  edit?: boolean;
  pathname: string;
}) {
  const context = await getAuthContext();

  if (!context) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }

  if (
    shouldForcePasswordReset({
      mustChangePassword: context.profile.mustChangePassword,
      pathname: input.pathname,
    })
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Password reset required before continuing." },
        { status: 403 },
      ),
    };
  }

  const isAuthorized = input.edit
    ? canEditPage({
        role: context.profile.role,
        page: input.page,
        permissions: context.permissions,
      })
    : canAccessPage({
        role: context.profile.role,
        page: input.page,
        permissions: context.permissions,
      });

  if (!isAuthorized) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    context,
  };
}
