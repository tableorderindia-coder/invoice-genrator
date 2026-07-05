export const FOUNDER_BALANCE_FOUNDERS = [
  {
    key: "nirbhay_kumar_giri",
    name: "Nirbhay Kumar Giri",
  },
  {
    key: "pawan_kumar_beesetti",
    name: "Pawan Kumar Beesetti",
  },
  {
    key: "vishal_savaliya",
    name: "Vishal Savaliya",
  },
] as const;

type FounderBalanceFounder = (typeof FOUNDER_BALANCE_FOUNDERS)[number];
type FounderBalanceFounderKey = FounderBalanceFounder["key"];

type FounderWithdrawalMap = Record<FounderBalanceFounderKey, number>;

export type FounderBalanceSourceRow = {
  companyId: string;
  year: number;
  month: number;
  netPlInrCents: number;
};

export type FounderWithdrawal = {
  companyId: string | null;
  year: number;
  month: number;
  founderKey: FounderBalanceFounderKey;
  withdrawalInrCents: number;
  updatedAt: string;
};

type FounderBalanceRow = {
  key: string;
  year: number;
  month: number;
  netPlInrCents: number;
  founderShareInrCents: number;
  founderEntitlementInrCents: number;
  withdrawals: FounderWithdrawalMap;
  updatedAt?: string;
};

export type FounderBalanceModel = {
  companyId: string | null;
  rows: FounderBalanceRow[];
  totals: {
    netPlInrCents: number;
    founderShareInrCents: number;
    founderEntitlementInrCents: number;
    withdrawals: FounderWithdrawalMap;
  };
  available: FounderWithdrawalMap;
};

export type ParsedFounderWithdrawalRow = {
  year: number;
  month: number;
  withdrawals: FounderWithdrawalMap;
};

const emptyWithdrawalMap = (): FounderWithdrawalMap => ({
  nirbhay_kumar_giri: 0,
  pawan_kumar_beesetti: 0,
  vishal_savaliya: 0,
});

const monthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;

const parseMonthKey = (value: string) => {
  const [yearPart, monthPart] = value.split("-");
  const year = Number.parseInt(yearPart ?? "", 10);
  const month = Number.parseInt(monthPart ?? "", 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("Invalid founder balance month.");
  }
  return { year, month };
};

function inrCentsFromFormValue(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const amount = Number.parseFloat(raw);
  if (!Number.isFinite(amount)) {
    throw new Error("Withdrawal amount must be a valid number.");
  }
  if (amount < 0) {
    throw new Error("Withdrawal amounts cannot be negative.");
  }
  return Math.round(amount * 100);
}

export function buildFounderBalanceModel(input: {
  companyId: string | null;
  sourceRows: FounderBalanceSourceRow[];
  withdrawals: FounderWithdrawal[];
}): FounderBalanceModel {
  const grouped = new Map<string, FounderBalanceSourceRow[]>();
  for (const row of input.sourceRows) {
    const key = monthKey(row.year, row.month);
    const rows = grouped.get(key) ?? [];
    rows.push(row);
    grouped.set(key, rows);
  }

  const withdrawalsByMonth = new Map<string, FounderWithdrawal[]>();
  for (const withdrawal of input.withdrawals) {
    const key = monthKey(withdrawal.year, withdrawal.month);
    const rows = withdrawalsByMonth.get(key) ?? [];
    rows.push(withdrawal);
    withdrawalsByMonth.set(key, rows);
  }

  const rows: FounderBalanceRow[] = [...grouped.entries()]
    .map(([key, bucket]) => {
      const first = bucket[0];
      const netPlInrCents = bucket.reduce((sum, row) => sum + row.netPlInrCents, 0);
      const withdrawalMap = emptyWithdrawalMap();
      let updatedAt: string | undefined;

      for (const withdrawal of withdrawalsByMonth.get(key) ?? []) {
        withdrawalMap[withdrawal.founderKey] += withdrawal.withdrawalInrCents;
        if (!updatedAt || withdrawal.updatedAt > updatedAt) {
          updatedAt = withdrawal.updatedAt;
        }
      }

      return {
        key,
        year: first.year,
        month: first.month,
        netPlInrCents,
        founderShareInrCents: netPlInrCents,
        founderEntitlementInrCents: Math.round(netPlInrCents / FOUNDER_BALANCE_FOUNDERS.length),
        withdrawals: withdrawalMap,
        updatedAt,
      };
    })
    .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month));

  const totals = {
    netPlInrCents: 0,
    founderShareInrCents: 0,
    founderEntitlementInrCents: 0,
    withdrawals: emptyWithdrawalMap(),
  };
  const available = emptyWithdrawalMap();

  for (const row of rows) {
    totals.netPlInrCents += row.netPlInrCents;
    totals.founderShareInrCents += row.founderShareInrCents;
    totals.founderEntitlementInrCents += row.founderEntitlementInrCents;
    for (const founder of FOUNDER_BALANCE_FOUNDERS) {
      totals.withdrawals[founder.key] += row.withdrawals[founder.key];
      available[founder.key] +=
        row.founderEntitlementInrCents - row.withdrawals[founder.key];
    }
  }

  return {
    companyId: input.companyId,
    rows,
    totals,
    available,
  };
}

export function parseFounderWithdrawalRows(formData: FormData): ParsedFounderWithdrawalRow[] {
  const selected = new Set(formData.getAll("selectedRow").map(String));
  if (selected.size === 0) {
    throw new Error("Select at least one row to update.");
  }

  return formData
    .getAll("rowKey")
    .map(String)
    .filter((key) => selected.has(key))
    .map((key) => {
      const { year, month } = parseMonthKey(key);
      const withdrawals = emptyWithdrawalMap();
      for (const founder of FOUNDER_BALANCE_FOUNDERS) {
        withdrawals[founder.key] = inrCentsFromFormValue(
          formData.get(`withdrawal__${key}__${founder.key}`),
        );
      }
      return {
        year,
        month,
        withdrawals,
      };
    });
}
