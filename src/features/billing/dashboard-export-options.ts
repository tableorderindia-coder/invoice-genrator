export type DashboardExportOptions = {
  includeExpenses: boolean;
  includeAdvances: boolean;
  includeReimbursements: boolean;
};

export function resolveDashboardExportOptions(
  params: Pick<URLSearchParams, "get">,
): DashboardExportOptions {
  return {
    includeExpenses: params.get("includeExpenses") !== "0",
    includeAdvances: params.get("includeAdvances") !== "0",
    includeReimbursements: params.get("includeReimbursements") !== "0",
  };
}

export function buildDashboardExportHref(
  href: string,
  options: DashboardExportOptions,
) {
  const url = new URL(href, "http://dashboard.local");
  url.searchParams.set("includeExpenses", options.includeExpenses ? "1" : "0");
  url.searchParams.set("includeAdvances", options.includeAdvances ? "1" : "0");
  url.searchParams.set(
    "includeReimbursements",
    options.includeReimbursements ? "1" : "0",
  );
  return `${url.pathname}${url.search}`;
}
