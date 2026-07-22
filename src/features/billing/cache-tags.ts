export type BillingInvalidationInput =
  | { type: "employee"; companyId: string }
  | { type: "salary"; companyId: string; month: string }
  | { type: "cashflow"; companyId: string; month?: string }
  | { type: "invoice"; companyId: string }
  | { type: "expense"; companyId: string }
  | { type: "company"; companyId?: string };

export function normalizeCacheScopeIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))].sort().join(",");
}

const tag = (parts: Array<string | undefined>) => ["billing", ...parts.filter(Boolean)].join(":");

export const billingCacheTags = {
  companies: () => tag(["companies"]),
  employees: (companyIds: string[]) => tag(["employees", normalizeCacheScopeIds(companyIds)]),
  invoices: (companyIds: string[]) => tag(["invoices", normalizeCacheScopeIds(companyIds)]),
  paymentMonths: (companyIds: string[]) =>
    tag(["payment-months", normalizeCacheScopeIds(companyIds)]),
  salary: (companyId: string, month?: string) => tag(["salary", companyId, month]),
  cashflow: (companyId: string, month?: string) => tag(["cashflow", companyId, month]),
  dashboard: (companyId: string) => tag(["dashboard", companyId]),
  overview: (companyId: string) => tag(["overview", companyId]),
};

export function getBillingInvalidationTags(input: BillingInvalidationInput) {
  switch (input.type) {
    case "employee":
      return [
        billingCacheTags.companies(),
        billingCacheTags.employees([input.companyId]),
        billingCacheTags.salary(input.companyId),
        billingCacheTags.invoices([input.companyId]),
        billingCacheTags.cashflow(input.companyId),
        billingCacheTags.dashboard(input.companyId),
        billingCacheTags.overview(input.companyId),
      ];
    case "salary":
      return [
        billingCacheTags.salary(input.companyId),
        billingCacheTags.salary(input.companyId, input.month),
        billingCacheTags.cashflow(input.companyId),
        billingCacheTags.cashflow(input.companyId, input.month),
        billingCacheTags.dashboard(input.companyId),
        billingCacheTags.overview(input.companyId),
        billingCacheTags.paymentMonths([input.companyId]),
      ];
    case "cashflow":
      return [
        billingCacheTags.cashflow(input.companyId),
        billingCacheTags.cashflow(input.companyId, input.month),
        billingCacheTags.dashboard(input.companyId),
        billingCacheTags.overview(input.companyId),
        billingCacheTags.paymentMonths([input.companyId]),
      ];
    case "invoice":
      return [
        billingCacheTags.invoices([input.companyId]),
        billingCacheTags.cashflow(input.companyId),
        billingCacheTags.dashboard(input.companyId),
        billingCacheTags.overview(input.companyId),
        billingCacheTags.paymentMonths([input.companyId]),
      ];
    case "expense":
      return [
        billingCacheTags.dashboard(input.companyId),
        billingCacheTags.overview(input.companyId),
      ];
    case "company":
      return [
        billingCacheTags.companies(),
        ...(input.companyId
          ? [
              billingCacheTags.dashboard(input.companyId),
              billingCacheTags.overview(input.companyId),
            ]
          : []),
      ];
  }
}
