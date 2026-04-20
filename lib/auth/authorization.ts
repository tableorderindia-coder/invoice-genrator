export const APP_PAGES = [
  { id: "overview", label: "Overview", path: "/" },
  { id: "companies", label: "Companies", path: "/companies" },
  { id: "employees", label: "Employees", path: "/employees" },
  { id: "invoices", label: "Invoices", path: "/invoices" },
  { id: "cashout", label: "Cashout", path: "/cashout" },
  {
    id: "employee-cash-flow",
    label: "Employee Cash Flow",
    path: "/employee-cash-flow",
  },
  {
    id: "employee-statements",
    label: "Employee Statements",
    path: "/employee-statements",
  },
  { id: "expenses", label: "Expenses", path: "/expenses" },
  { id: "dashboard", label: "Dashboard", path: "/dashboard" },
  { id: "admin-users", label: "Admin Users", path: "/admin/users" },
] as const;

export type AppPage = (typeof APP_PAGES)[number]["id"];
export type AppRole = "admin" | "user";

export type AppPermission = {
  page: AppPage;
  canView: boolean;
  canEdit: boolean;
};

const PASSWORD_RESET_ALLOWED_PATHS = ["/reset-password", "/logout"];

export function canAccessPage(input: {
  role: AppRole;
  page: AppPage;
  permissions: AppPermission[];
}) {
  if (input.role === "admin") {
    return true;
  }

  return input.permissions.some(
    (permission) => permission.page === input.page && permission.canView,
  );
}

export function canEditPage(input: {
  role: AppRole;
  page: AppPage;
  permissions: AppPermission[];
}) {
  if (input.role === "admin") {
    return true;
  }

  return input.permissions.some(
    (permission) => permission.page === input.page && permission.canEdit,
  );
}

export function shouldForcePasswordReset(input: {
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

export function getDefaultRedirectPath(input: {
  role: AppRole;
  permissions: AppPermission[];
  mustChangePassword: boolean;
}) {
  if (input.mustChangePassword) {
    return "/reset-password";
  }

  if (input.role === "admin") {
    return "/admin/users";
  }

  const redirectPriority: AppPage[] = [
    "dashboard",
    "overview",
    "invoices",
    "companies",
    "employees",
    "cashout",
    "employee-cash-flow",
    "employee-statements",
    "expenses",
    "admin-users",
  ];

  const firstAllowedPage = redirectPriority
    .map((pageId) => APP_PAGES.find((page) => page.id === pageId))
    .find((page) =>
      page
        ? canAccessPage({
            role: input.role,
            page: page.id,
            permissions: input.permissions,
          })
        : false,
    );

  if (firstAllowedPage) {
    return firstAllowedPage.path;
  }

  const fallbackAllowedPage = APP_PAGES.find((page) =>
    canAccessPage({
      role: input.role,
      page: page.id,
      permissions: input.permissions,
    }),
  );

  return fallbackAllowedPage?.path ?? "/unauthorized";
}

export function normalizePermissionPage(page: string): AppPage | null {
  const matchingPage = APP_PAGES.find((candidate) => candidate.id === page);
  return matchingPage?.id ?? null;
}
