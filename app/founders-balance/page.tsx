import { GlassPanel } from "../_components/glass-panel";
import { Shell } from "../_components/shell";
import { inputClass } from "../_components/field";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { requirePageAccess } from "@/lib/auth/server";
import { saveFounderWithdrawalsAction } from "../../src/features/billing/actions";
import { getFounderBalanceData, listCompanies } from "../../src/features/billing/store";
import { FoundersBalanceTable } from "./founders-balance-table";

export const dynamic = "force-dynamic";

export default async function FoundersBalancePage({
  searchParams,
}: {
  searchParams: Promise<{
    companyId?: string | string[];
    flashStatus?: string | string[];
    flashMessage?: string | string[];
  }>;
}) {
  await requirePageAccess("dashboard");
  const resolved = await searchParams;
  const companies = await listCompanies();
  const selectedCompanyIdRaw = Array.isArray(resolved.companyId)
    ? resolved.companyId[0]
    : resolved.companyId;
  const selectedCompanyId =
    !selectedCompanyIdRaw || selectedCompanyIdRaw === "all" ? "all" : selectedCompanyIdRaw;
  const modelCompanyId = selectedCompanyId === "all" ? null : selectedCompanyId;
  const data = await getFounderBalanceData({ companyId: modelCompanyId });

  const flashStatus = Array.isArray(resolved.flashStatus)
    ? resolved.flashStatus[0]
    : resolved.flashStatus;
  const flashMessage = Array.isArray(resolved.flashMessage)
    ? resolved.flashMessage[0]
    : resolved.flashMessage;
  const returnTo = `/founders-balance?companyId=${encodeURIComponent(selectedCompanyId)}`;

  return (
    <Shell title="Founder’s Balance" eyebrow="Founder withdrawals">
      <GlassPanel gradient className="overflow-visible">
        <form
          action="/founders-balance"
          className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"
        >
          <label className="block">
            <span
              className="mb-2 block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Select company
            </span>
            <select
              name="companyId"
              defaultValue={selectedCompanyId}
              className={inputClass}
              style={{
                border: "1px solid var(--glass-border)",
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-primary)",
              }}
            >
              <option value="all">All companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <PendingSubmitButton
            className="gradient-btn"
            defaultText="Load"
            pendingText="Loading..."
          />
        </form>
        {flashMessage ? (
          <div
            className="mt-4 rounded-2xl px-4 py-3 text-sm font-medium"
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
        ) : null}
      </GlassPanel>

      <GlassPanel title="Founder’s Balance" gradient className="overflow-visible">
        <FoundersBalanceTable
          companyId={selectedCompanyId}
          data={data}
          returnTo={returnTo}
          saveFounderWithdrawalsAction={saveFounderWithdrawalsAction}
        />
      </GlassPanel>
    </Shell>
  );
}
