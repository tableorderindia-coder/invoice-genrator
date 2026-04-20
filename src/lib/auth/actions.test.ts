import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
const revalidatePathMock = vi.fn();
const requireAdminAccessMock = vi.fn();
const createSupabaseAdminClientMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/auth/server", () => ({
  requireAdminAccess: requireAdminAccessMock,
  requireAuthContext: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: createSupabaseAdminClientMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

describe("auth actions", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    revalidatePathMock.mockReset();
    requireAdminAccessMock.mockReset();
    createSupabaseAdminClientMock.mockReset();
  });

  it("redirects with a visible error when managed user creation fails after auth user creation", async () => {
    const profileInsert = vi.fn().mockResolvedValue({ error: null });
    const permissionsDelete = vi.fn().mockResolvedValue({ error: null });
    const permissionsInsert = vi
      .fn()
      .mockResolvedValue({ error: new Error("permissions insert failed") });

    const fromMock = vi.fn((table: string) => {
      if (table === "profiles") {
        return { insert: profileInsert };
      }

      if (table === "permissions") {
        return {
          delete: () => ({
            eq: permissionsDelete,
          }),
          insert: permissionsInsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    requireAdminAccessMock.mockResolvedValue({
      supabase: {
        from: fromMock,
      },
    });

    createSupabaseAdminClientMock.mockReturnValue({
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user_1" } },
            error: null,
          }),
        },
      },
    });

    const { createManagedUserAction } = await import("@/lib/auth/actions");
    const formData = new FormData();
    formData.set("email", "admin@example.com");
    formData.set("tempPassword", "temporarypass");
    formData.set("role", "admin");
    formData.set("perm:dashboard:view", "on");

    await expect(createManagedUserAction(formData)).rejects.toThrow(
      "REDIRECT:/admin/users?error=permissions%20insert%20failed",
    );

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
