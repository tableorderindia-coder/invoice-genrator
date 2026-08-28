import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn((path: string) => {
  // Mirrors how Next.js's real redirect() signals control flow: throwing an
  // error whose `.digest` starts with NEXT_REDIRECT (see
  // isRedirectControlFlow in lib/auth/actions.ts).
  const error = new Error(`REDIRECT:${path}`) as Error & { digest: string };
  error.digest = `NEXT_REDIRECT;${path}`;
  throw error;
});
const revalidatePathMock = vi.fn();
const requireAdminAccessMock = vi.fn();
const queryMock = vi.fn();
const withTransactionMock = vi.fn();
const hashPasswordMock = vi.fn(async (password: string) => `hashed:${password}`);

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/auth/server", () => ({
  requireAdminAccess: requireAdminAccessMock,
  getAuthContext: vi.fn(),
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword: hashPasswordMock,
  verifyPassword: vi.fn(),
}));

vi.mock("@/lib/auth/cookies", () => ({
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
}));

vi.mock("@/lib/db/pool", () => ({
  query: (...args: unknown[]) => queryMock(...args),
  withTransaction: (...args: unknown[]) => withTransactionMock(...args),
}));

describe("auth actions", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    revalidatePathMock.mockReset();
    requireAdminAccessMock.mockReset();
    queryMock.mockReset();
    withTransactionMock.mockReset();
  });

  it("redirects with a visible error when managed user creation fails after insert", async () => {
    requireAdminAccessMock.mockResolvedValue({});

    const clientQuery = vi.fn((sql: string) => {
      if (sql.includes("insert into public.profiles")) {
        return Promise.resolve({ rows: [{ id: "user_1" }], rowCount: 1 });
      }
      if (sql.includes("delete from public.permissions")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("insert into public.permissions")) {
        return Promise.reject(new Error("permissions insert failed"));
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    withTransactionMock.mockImplementation(async (fn: (client: unknown) => unknown) =>
      fn({ query: clientQuery }),
    );

    const { createManagedUserAction } = await import("@/lib/auth/actions");
    const formData = new FormData();
    formData.set("email", "admin@example.com");
    formData.set("tempPassword", "temporarypassword");
    formData.set("role", "admin");
    formData.set("perm:dashboard:view", "on");

    await expect(createManagedUserAction(formData)).rejects.toThrow(
      "REDIRECT:/admin/users?error=permissions%20insert%20failed",
    );

    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("syncs selected company access when updating a managed user", async () => {
    requireAdminAccessMock.mockResolvedValue({});

    const clientQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    withTransactionMock.mockImplementation(async (fn: (client: unknown) => unknown) =>
      fn({ query: clientQuery }),
    );

    const { updateManagedUserAccessAction } = await import("@/lib/auth/actions");
    const formData = new FormData();
    formData.set("userId", "user_1");
    formData.set("role", "user");
    formData.append("companyAccess", "company_a");
    formData.append("companyAccess", "company_b");

    await expect(updateManagedUserAccessAction(formData)).rejects.toThrow(
      "REDIRECT:/admin/users?success=Access+updated",
    );

    expect(clientQuery).toHaveBeenCalledWith(
      expect.stringContaining("insert into public.user_company_access"),
      ["user_1", "company_a", "user_1", "company_b"],
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users");
  });
});
