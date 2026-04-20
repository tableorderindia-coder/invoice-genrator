import { APP_PAGES } from "@/lib/auth/authorization";
import { requireAdminAccess } from "@/lib/auth/server";
import {
  createManagedUserAction,
  updateManagedUserAccessAction,
} from "@/lib/auth/actions";
import { GlassPanel } from "@/app/_components/glass-panel";
import { inputClass } from "@/app/_components/field";
import { PendingSubmitButton } from "@/app/_components/pending-submit-button";
import { Shell } from "@/app/_components/shell";
import PasswordInput from "@/components/PasswordInput";
import { AccessMatrix } from "./_components/access-matrix";

type ProfileRow = {
  id: string;
  email: string;
  role: "admin" | "user";
  must_change_password: boolean;
  created_at: string;
};

type PermissionRow = {
  user_id: string;
  page: string;
  can_view: boolean;
  can_edit: boolean;
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    success?: string | string[];
  }>;
}) {
  const context = await requireAdminAccess();
  const params = await searchParams;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const success = Array.isArray(params.success) ? params.success[0] : params.success;

  const [{ data: profiles }, { data: permissionRows }] = await Promise.all([
    context.supabase
      .from("profiles")
      .select("id, email, role, must_change_password, created_at")
      .order("created_at", { ascending: true }),
    context.supabase
      .from("permissions")
      .select("user_id, page, can_view, can_edit")
      .order("page", { ascending: true }),
  ]);

  const permissionsByUserId = new Map<string, PermissionRow[]>();
  for (const permission of (permissionRows ?? []) as PermissionRow[]) {
    const current = permissionsByUserId.get(permission.user_id) ?? [];
    current.push(permission);
    permissionsByUserId.set(permission.user_id, current);
  }

  const creatablePages = APP_PAGES.filter((page) => page.id !== "admin-users");

  return (
    <Shell title="Admin Users" eyebrow="Access control">
      {error ? (
        <div className="glass-card px-4 py-3 text-sm" style={{ color: "#fca5a5" }}>
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="glass-card px-4 py-3 text-sm" style={{ color: "#6ee7b7" }}>
          {success}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassPanel gradient>
          <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Create user
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            New users are created with a temporary password and must reset it on first
            login.
          </p>

          <form action={createManagedUserAction} className="mt-6 space-y-5">
            <label className="block space-y-2 text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Email</span>
              <input name="email" type="email" required className={inputClass} />
            </label>

            <label className="block space-y-2 text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Temporary password</span>
              <PasswordInput
                name="tempPassword"
                required
                minLength={12}
                className={inputClass}
              />
            </label>

            <label className="block space-y-2 text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Role</span>
              <select name="role" defaultValue="user" className={inputClass}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <div className="space-y-3">
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Page permissions
              </p>
              <AccessMatrix pages={creatablePages} />
            </div>

            <PendingSubmitButton
              className="gradient-btn w-full"
              defaultText="Create user"
              pendingText="Creating..."
            />
          </form>
        </GlassPanel>

        <div className="space-y-6">
          {((profiles ?? []) as ProfileRow[]).map((profile) => {
            const userPermissions = permissionsByUserId.get(profile.id) ?? [];
            const permissionMap = new Map(userPermissions.map((permission) => [permission.page, permission]));

            return (
              <GlassPanel key={profile.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2
                      className="text-xl font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {profile.email}
                    </h2>
                    <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                      Role: {profile.role} · Must reset password:{" "}
                      {profile.must_change_password ? "yes" : "no"}
                    </p>
                  </div>
                </div>

                <form action={updateManagedUserAccessAction} className="mt-5 space-y-4">
                  <input type="hidden" name="userId" value={profile.id} />

                  <label className="block space-y-2 text-sm">
                    <span style={{ color: "var(--text-secondary)" }}>Role</span>
                    <select name="role" defaultValue={profile.role} className={inputClass}>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>

                  <div className="space-y-3">
                    <AccessMatrix
                      pages={APP_PAGES}
                      defaults={Object.fromEntries(
                        APP_PAGES.map((page) => [
                          page.id,
                          {
                            canView: permissionMap.get(page.id)?.can_view ?? false,
                            canEdit: permissionMap.get(page.id)?.can_edit ?? false,
                          },
                        ]),
                      )}
                    />
                  </div>

                  <PendingSubmitButton
                    className="btn-outline"
                    defaultText="Save access"
                    pendingText="Saving..."
                  />
                </form>
              </GlassPanel>
            );
          })}
        </div>
      </section>
    </Shell>
  );
}
