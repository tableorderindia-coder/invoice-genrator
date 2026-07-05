"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  APP_PAGES,
  type AppPage,
  type AppRole,
} from "./authorization";
import { requireAdminAccess } from "./server";

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

async function syncPermissions(input: {
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
  userId: string;
  permissions: Array<{
    page: AppPage;
    canView: boolean;
    canEdit: boolean;
  }>;
}) {
  const { error: deleteError } = await input.supabase
    .from("permissions")
    .delete()
    .eq("user_id", input.userId);

  if (deleteError) {
    throw deleteError;
  }

  if (input.permissions.length === 0) {
    return;
  }

  const { error: insertError } = await input.supabase.from("permissions").insert(
    input.permissions.map((permission) => ({
      user_id: input.userId,
      page: permission.page,
      can_view: permission.canView,
      can_edit: permission.canEdit,
    })),
  );

  if (insertError) {
    throw insertError;
  }
}

function formatActionError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallbackMessage;
}

function isRedirectControlFlow(error: unknown) {
  return error instanceof Error && error.message.startsWith("REDIRECT:");
}

export async function createManagedUserAction(formData: FormData) {
  try {
    const context = await requireAdminAccess();
    const adminClient = createSupabaseAdminClient();

    if (!adminClient) {
      redirect("/admin/users?error=Supabase+admin+credentials+are+not+configured");
    }

    const email = getString(formData, "email").toLowerCase();
    const tempPassword = getString(formData, "tempPassword");
    const role = getRole(formData);
    const permissions = getSelectedPermissions(formData);

    if (!email || !tempPassword) {
      redirect("/admin/users?error=Email+and+temporary+password+are+required");
    }

    const { data: createdUser, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          role,
        },
      });

    if (createUserError || !createdUser.user) {
      redirect(
        `/admin/users?error=${encodeURIComponent(
          createUserError?.message ?? "Unable to create user.",
        )}`,
      );
    }

    const { error: profileError } = await context.supabase.from("profiles").insert({
      id: createdUser.user.id,
      email,
      role,
      must_change_password: true,
    });

    if (profileError) {
      redirect(`/admin/users?error=${encodeURIComponent(profileError.message)}`);
    }

    await syncPermissions({
      supabase: context.supabase,
      userId: createdUser.user.id,
      permissions,
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
    const context = await requireAdminAccess();

    const userId = getString(formData, "userId");
    const role = getRole(formData);
    const permissions = getSelectedPermissions(formData);

    if (!userId) {
      redirect("/admin/users?error=User+ID+is+required");
    }

    const { error: profileError } = await context.supabase
      .from("profiles")
      .update({
        role,
      })
      .eq("id", userId);

    if (profileError) {
      redirect(`/admin/users?error=${encodeURIComponent(profileError.message)}`);
    }

    await syncPermissions({
      supabase: context.supabase,
      userId,
      permissions,
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
