"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { query, withTransaction } from "@/lib/db/pool";
import type { PoolClient } from "pg";

import { clearSessionCookie, setSessionCookie } from "./cookies";
import { hashPassword, verifyPassword } from "./password";
import {
  APP_PAGES,
  getDefaultRedirectPath,
  normalizePermissionPage,
  type AppPage,
  type AppPermission,
  type AppRole,
} from "./authorization";
import { getAuthContext, requireAdminAccess } from "./server";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getRole(formData: FormData, key = "role"): AppRole {
  return getString(formData, key) === "admin" ? "admin" : "user";
}

function getSelectedPermissions(formData: FormData) {
  const permissions = new Map<
    AppPage,
    {
      page: AppPage;
      canView: boolean;
      canEdit: boolean;
    }
  >();

  for (const page of APP_PAGES) {
    permissions.set(page.id, {
      page: page.id,
      canView: formData.get(`perm:${page.id}:view`) === "on",
      canEdit: formData.get(`perm:${page.id}:edit`) === "on",
    });
  }

  return [...permissions.values()].filter(
    (permission) => permission.canView || permission.canEdit,
  );
}

function getSelectedCompanyIds(formData: FormData) {
  return [
    ...new Set(
      formData
        .getAll("companyAccess")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  ];
}

async function syncPermissions(input: {
  client: PoolClient;
  userId: string;
  permissions: Array<{
    page: AppPage;
    canView: boolean;
    canEdit: boolean;
  }>;
}) {
  await input.client.query(`delete from public.permissions where user_id = $1`, [
    input.userId,
  ]);

  if (input.permissions.length === 0) {
    return;
  }

  const values: string[] = [];
  const params: unknown[] = [];
  input.permissions.forEach((permission, index) => {
    const offset = index * 4;
    values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
    params.push(input.userId, permission.page, permission.canView, permission.canEdit);
  });

  await input.client.query(
    `insert into public.permissions (user_id, page, can_view, can_edit)
     values ${values.join(", ")}`,
    params,
  );
}

async function syncCompanyAccess(input: {
  client: PoolClient;
  userId: string;
  companyIds: string[];
}) {
  await input.client.query(
    `delete from public.user_company_access where user_id = $1`,
    [input.userId],
  );

  if (input.companyIds.length === 0) {
    return;
  }

  const values: string[] = [];
  const params: unknown[] = [];
  input.companyIds.forEach((companyId, index) => {
    const offset = index * 2;
    values.push(`($${offset + 1}, $${offset + 2})`);
    params.push(input.userId, companyId);
  });

  await input.client.query(
    `insert into public.user_company_access (user_id, company_id) values ${values.join(", ")}`,
    params,
  );
}

function formatActionError(error: unknown, fallbackMessage: string) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  ) {
    return "That email is already in use.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}

function isRedirectControlFlow(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function createManagedUserAction(formData: FormData) {
  try {
    await requireAdminAccess();

    const email = getString(formData, "email").toLowerCase();
    const tempPassword = getString(formData, "tempPassword");
    const role = getRole(formData);
    const permissions = getSelectedPermissions(formData);
    const companyIds = getSelectedCompanyIds(formData);

    if (!email || !tempPassword) {
      redirect("/admin/users?error=Email+and+temporary+password+are+required");
    }
    if (tempPassword.length < 12) {
      redirect("/admin/users?error=Temporary+password+must+be+at+least+12+characters");
    }

    const passwordHash = await hashPassword(tempPassword);

    await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `insert into public.profiles (email, password_hash, role, must_change_password)
         values ($1, $2, $3, true)
         returning id`,
        [email, passwordHash, role],
      );
      const userId = rows[0].id;

      await syncPermissions({ client, userId, permissions });
      await syncCompanyAccess({ client, userId, companyIds });
    });

    revalidatePath("/admin/users");
    redirect("/admin/users?success=User+created");
  } catch (error) {
    if (isRedirectControlFlow(error)) {
      throw error;
    }

    console.error("Failed to create managed user", error);
    redirect(
      `/admin/users?error=${encodeURIComponent(
        formatActionError(error, "Unable to create user."),
      )}`,
    );
  }
}

export async function updateManagedUserAccessAction(formData: FormData) {
  try {
    await requireAdminAccess();

    const userId = getString(formData, "userId");
    const role = getRole(formData);
    const newPassword = getString(formData, "newPassword");
    const permissions = getSelectedPermissions(formData);
    const companyIds = getSelectedCompanyIds(formData);

    if (!userId) {
      redirect("/admin/users?error=User+ID+is+required");
    }
    if (newPassword && newPassword.length < 12) {
      redirect("/admin/users?error=New+password+must+be+at+least+12+characters");
    }

    await withTransaction(async (client) => {
      if (newPassword) {
        const passwordHash = await hashPassword(newPassword);
        await client.query(
          `update public.profiles
           set role = $1, password_hash = $2, must_change_password = true
           where id = $3`,
          [role, passwordHash, userId],
        );
      } else {
        await client.query(`update public.profiles set role = $1 where id = $2`, [
          role,
          userId,
        ]);
      }

      await syncPermissions({ client, userId, permissions });
      await syncCompanyAccess({ client, userId, companyIds });
    });

    revalidatePath("/admin/users");
    redirect("/admin/users?success=Access+updated");
  } catch (error) {
    if (isRedirectControlFlow(error)) {
      throw error;
    }

    console.error("Failed to update managed user access", error);
    redirect(
      `/admin/users?error=${encodeURIComponent(
        formatActionError(error, "Unable to update access."),
      )}`,
    );
  }
}

export type LoginActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

/**
 * Called directly from the client LoginForm (not as a <form action>), so it
 * can drive the existing Rive-character success/fail animation before
 * navigating - mirrors the old supabase.auth.signInWithPassword() call site.
 */
export async function loginAction(formData: FormData): Promise<LoginActionResult> {
  const email = getString(formData, "email").toLowerCase();
  const password = getString(formData, "password");

  if (!email || !password) {
    return { ok: false, error: "Invalid email or password" };
  }

  const { rows } = await query<{
    id: string;
    password_hash: string;
    role: AppRole;
    must_change_password: boolean;
  }>(
    `select id, password_hash, role, must_change_password
     from public.profiles where email = $1`,
    [email],
  );

  const profile = rows[0];
  if (!profile) {
    return { ok: false, error: "Invalid email or password" };
  }

  const passwordMatches = await verifyPassword(password, profile.password_hash);
  if (!passwordMatches) {
    return { ok: false, error: "Invalid email or password" };
  }

  const { rows: permissionRows } = await query<{
    page: string;
    can_view: boolean;
    can_edit: boolean;
  }>(`select page, can_view, can_edit from public.permissions where user_id = $1`, [
    profile.id,
  ]);

  const permissions: AppPermission[] = permissionRows
    .map((row) => {
      const page = normalizePermissionPage(row.page);
      if (!page) {
        return null;
      }
      return { page, canView: row.can_view, canEdit: row.can_edit } satisfies AppPermission;
    })
    .filter((permission): permission is AppPermission => permission !== null);

  await setSessionCookie(profile.id);

  return {
    ok: true,
    redirectTo: getDefaultRedirectPath({
      role: profile.role,
      permissions,
      mustChangePassword: profile.must_change_password,
    }),
  };
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export type ChangePasswordActionResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

/**
 * Used by the forced (must_change_password) and voluntary password-change
 * flow at /reset-password. Requires an existing session - there is no
 * unauthenticated "reset link" anymore (see the admin-reset flow in
 * updateManagedUserAccessAction instead).
 */
export async function changePasswordAction(
  newPassword: string,
): Promise<ChangePasswordActionResult> {
  const context = await getAuthContext();
  if (!context) {
    return { ok: false, error: "Invalid or expired session" };
  }

  if (newPassword.length < 12) {
    return { ok: false, error: "Password must be at least 12 characters" };
  }

  const passwordHash = await hashPassword(newPassword);
  await query(
    `update public.profiles
     set password_hash = $1, must_change_password = false
     where id = $2`,
    [passwordHash, context.userId],
  );

  return {
    ok: true,
    redirectTo: getDefaultRedirectPath({
      role: context.profile.role,
      permissions: context.permissions,
      mustChangePassword: false,
    }),
  };
}
