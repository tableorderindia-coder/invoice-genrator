import { redirect } from "next/navigation";
import { cache } from "react";

import { query } from "@/lib/db/pool";

import { getSessionUserId } from "./cookies";
import {
  canAccessCompany,
  canAccessPage,
  canEditPage,
  normalizePermissionPage,
  type AppPage,
  type AppPermission,
  type AppRole,
} from "./authorization";

type AuthProfile = {
  id: string;
  email: string;
  role: AppRole;
  mustChangePassword: boolean;
  createdAt: string;
};

export type AuthContext = {
  userId: string;
  email: string;
  profile: AuthProfile;
  permissions: AppPermission[];
  companyAccess: string[];
};

type RawProfileRow = {
  id: string;
  email: string;
  role: AppRole;
  must_change_password: boolean;
  created_at: string;
};

type RawPermissionRow = {
  page: string;
  can_view: boolean;
  can_edit: boolean;
};

type RawCompanyAccessRow = {
  company_id: string;
};

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const userId = await getSessionUserId();
  if (!userId) {
    return null;
  }

  const { rows: profileRows } = await query<RawProfileRow>(
    `select id, email, role, must_change_password, created_at
     from public.profiles
     where id = $1`,
    [userId],
  );

  const profile = profileRows[0];
  if (!profile) {
    return null;
  }

  const [{ rows: permissionRows }, { rows: companyAccessRows }] = await Promise.all([
    query<RawPermissionRow>(
      `select page, can_view, can_edit from public.permissions where user_id = $1`,
      [userId],
    ),
    query<RawCompanyAccessRow>(
      `select company_id from public.user_company_access where user_id = $1`,
      [userId],
    ),
  ]);

  const permissions = permissionRows
    .map((row) => {
      const page = normalizePermissionPage(row.page);
      if (!page) {
        return null;
      }

      return {
        page,
        canView: row.can_view,
        canEdit: row.can_edit,
      } satisfies AppPermission;
    })
    .filter((permission): permission is AppPermission => permission !== null);

  const mappedProfile: AuthProfile = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    mustChangePassword: profile.must_change_password,
    createdAt: profile.created_at,
  };

  return {
    userId: profile.id,
    email: profile.email,
    profile: mappedProfile,
    permissions,
    companyAccess: companyAccessRows.map((row) => row.company_id),
  };
});

async function requireAuthContext() {
  const context = await getAuthContext();

  if (!context) {
    redirect("/login");
  }

  return context;
}

export async function requirePageAccess(page: AppPage) {
  const context = await requireAuthContext();

  if (context.profile.mustChangePassword) {
    redirect("/reset-password");
  }

  if (
    !canAccessPage({
      role: context.profile.role,
      page,
      permissions: context.permissions,
    })
  ) {
    redirect("/unauthorized");
  }

  return context;
}

export async function requirePageEditAccess(page: AppPage) {
  const context = await requireAuthContext();

  if (context.profile.mustChangePassword) {
    redirect("/reset-password");
  }

  if (
    !canEditPage({
      role: context.profile.role,
      page,
      permissions: context.permissions,
    })
  ) {
    redirect("/unauthorized");
  }

  return context;
}

export async function requireCompanyPageAccess(
  page: AppPage,
  companyId: string,
) {
  const context = await requirePageAccess(page);

  if (
    !canAccessCompany({
      role: context.profile.role,
      companyId,
      companyAccess: context.companyAccess,
    })
  ) {
    redirect("/unauthorized");
  }

  return context;
}

export async function requireCompanyPageEditAccess(
  page: AppPage,
  companyId: string,
) {
  const context = await requirePageEditAccess(page);

  if (
    !canAccessCompany({
      role: context.profile.role,
      companyId,
      companyAccess: context.companyAccess,
    })
  ) {
    redirect("/unauthorized");
  }

  return context;
}

export async function requireAdminAccess() {
  const context = await requireAuthContext();

  if (context.profile.mustChangePassword) {
    redirect("/reset-password");
  }

  if (context.profile.role !== "admin") {
    redirect("/unauthorized");
  }

  return context;
}
