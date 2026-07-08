import { GlassPanel } from "../_components/glass-panel";
import { Shell } from "../_components/shell";
import { requirePageAccess } from "@/lib/auth/server";
import {
  filterCompaniesForAuthContext,
} from "@/src/features/billing/company-access";
import { saveFounderWithdrawalsAction } from "../../src/features/billing/actions";
import { getFounderBalanceData, listCompanies } from "../../src/features/billing/store";
import { resolveSelectedCompanyIds } from "../../src/features/billing/filter-selection";
import { FoundersBalanceTable } from "./founders-balance-table";
import type { FounderBalanceModel } from "../../src/features/billing/founders-balance";

export const dynamic = "force-dynamic";

const emptyWithdrawalMap = () => ({
  nirbhay_kumar_giri: 0,
  pawan_kumar_beesetti: 0,
  vishal_savaliya: 0,
});

function mergeFounderBalanceData(data: FounderBalanceModel[]): FounderBalanceModel {
  const rowsByKey = new Map<string, FounderBalanceModel["rows"][number][]>();
  for (const model of data) {
    for (const row of model.rows) {
      rowsByKey.set(row.key, [...(rowsByKey.get(row.key) ?? []), row]);
    }
  }

  const rows = [...rowsByKey.entries()]
    .map(([key, bucket]) => {
      const first = bucket[0];
      const withdrawals = emptyWithdrawalMap();
      let updatedAt: string | undefined;
      for (const row of bucket) {
        for (const founderKey of Object.keys(withdrawals) as Array<keyof typeof withdrawals>) {
          withdrawals[founderKey] += row.withdrawals[founderKey];
        }
        if (row.updatedAt && (!updatedAt || row.updatedAt > updatedAt)) {
          updatedAt = row.updatedAt;
        }
      }
      const netPlInrCents = bucket.reduce((sum, row) => sum + row.netPlInrCents, 0);
      const founderShareInrCents = bucket.reduce(
        (sum, row) => sum + row.founderShareInrCents,
        0,
      );
      const founderEntitlementInrCents = bucket.reduce(
        (sum, row) => sum + row.founderEntitlementInrCents,
        0,
      );
      return {
        key,
        year: first.year,
        month: first.month,
        netPlInrCents,
        founderShareInrCents,
        founderEntitlementInrCents,
        withdrawals,
        updatedAt,
      };
    })
    .sort((left, right) => left.year * 100 + left.month - (right.year * 100 + right.month));

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
    for (const founderKey of Object.keys(totals.withdrawals) as Array<keyof typeof totals.withdrawals>) {
      totals.withdrawals[founderKey] += row.withdrawals[founderKey];
      available[founderKey] += row.founderEntitlementInrCents - row.withdrawals[founderKey];
    }
  }

  return {
    companyId: null,
    rows,
    totals,
    available,
  };
}

export default async function FoundersBalancePage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string | string[];
    companyIds?: string | string[];
    flashStatus?: string | string[];
    flashMessage?: string | string[];
  }>;
}) {
  const context = await requirePageAccess("dashboard");
  const resolved = await searchParams;
  const companies = filterCompaniesForAuthContext(await listCompanies(), context);
  const selectedCompanyIds = resolveSelectedCompanyIds({
    companyIds: resolved.companyIds,
    companyId: resolved.companyId,
    companies,
  });
  const allAccessibleCompaniesSelected = selectedCompanyIds.length === companies.length;
  const useGlobalAllCompanies =
    context.profile.role === "admin" && allAccessibleCompaniesSelected;
  const data = useGlobalAllCompanies
    ? await getFounderBalanceData({ companyId: null })
    : mergeFounderBalanceData(
        await Promise.all(
          selectedCompanyIds.map((companyId) => getFounderBalanceData({ companyId })),
        ),
      );
  const tableCompanyId = useGlobalAllCompanies
    ? "all"
    : selectedCompanyIds.length === 1
      ? selectedCompanyIds[0]
      : "all";
  const canEditWithdrawals = useGlobalAllCompanies || selectedCompanyIds.length === 1;

  const flashStatus = Array.isArray(resolved.flashStatus)
    ? resolved.flashStatus[0]
    : resolved.flashStatus;
  const flashMessage = Array.isArray(resolved.flashMessage)
    ? resolved.flashMessage[0]
    : resolved.flashMessage;
  const returnParams = new URLSearchParams();
  for (const companyId of selectedCompanyIds) {
    returnParams.append("companyIds", companyId);
  }
  const returnTo = `/founders-balance?${returnParams.toString()}`;

  return (
    <Shell
      title="Founders Balance"
      eyebrow="Founder withdrawals"
      companyOptions={companies.map((company) => ({ id: company.id, name: company.name }))}
      activeCompanyIds={selectedCompanyIds}
    >
      {flashMessage ? (
        <GlassPanel gradient className="overflow-visible">
          <div
            className="rounded-2xl px-4 py-3 text-sm font-medium"
            style={{
              background:
                flashStatus === "error"
                  ? "rgba(248, 113, 113, 0.08)"
                  : "rgba(16, 185, 129, 0.08)",
              border:
                flashStatus === "error"
                  ? "1px solid rgba(248, 113, 113, 0.25)"
                  : "1px solid rgba(16, 185, 129, 0.25)",
              color: flashStatus === "error" ? "#fca5a5" : "#6ee7b7",
            }}
          >
            {flashMessage}
          </div>
        </GlassPanel>
      ) : null}

      <GlassPanel title="Founders Balance" gradient className="overflow-visible">
        <FoundersBalanceTable
          companyId={tableCompanyId}
          data={data}
          returnTo={returnTo}
          canEdit={canEditWithdrawals}
          saveFounderWithdrawalsAction={saveFounderWithdrawalsAction}
        />
      </GlassPanel>
    </Shell>
  );
}
