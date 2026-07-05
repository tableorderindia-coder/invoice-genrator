import { redirect } from "next/navigation";
import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
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
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
};

type RawPermissionRow = {
  page: string;
  can_view: boolean;
  can_edit: boolean;
};

export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, role, must_change_password, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  const { data: permissionRows, error: permissionError } = await supabase
    .from("permissions")
    .select("page, can_view, can_edit")
    .eq("user_id", user.id);

  if (permissionError) {
    return null;
  }

  const permissions = ((permissionRows ?? []) as RawPermissionRow[])
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
    .filter(Boolean) as AppPermission[];

  const mappedProfile: AuthProfile = {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    mustChangePassword: profile.must_change_password,
    createdAt: profile.created_at,
  };

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    profile: mappedProfile,
    permissions,
    supabase,
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

