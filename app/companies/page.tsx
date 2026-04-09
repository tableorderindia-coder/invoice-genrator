import { Shell } from "../_components/shell";
import { GlassPanel } from "../_components/glass-panel";
import { Field, inputClass } from "../_components/field";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { StaggerGrid } from "../_components/stagger-grid";
import { createCompanyAction } from "@/src/features/billing/actions";
import { listCompanies } from "@/src/features/billing/store";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await listCompanies();

  return (
    <Shell title="Companies" eyebrow="Master data">
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <GlassPanel gradient>
          <form action={createCompanyAction}>
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Add company
            </h2>
            <div className="mt-5 space-y-4">
              <Field label="Company name">
                <input name="name" required className={inputClass} placeholder="Acme Corp" />
              </Field>
              <Field label="Billing address">
                <textarea name="billingAddress" required rows={3} className={inputClass} placeholder="123 Business St, City, State" />
              </Field>
              <Field label="Default note">
                <textarea name="defaultNote" required rows={4} className={inputClass} placeholder="Payment terms and instructions..." />
              </Field>
            </div>
            <PendingSubmitButton
              className="gradient-btn mt-5"
              defaultText="Save company"
              pendingText="Saving..."
            />
          </form>
        </GlassPanel>

        <GlassPanel gradient>
          <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Company roster
          </h2>
          <StaggerGrid className="mt-5 space-y-4">
            {companies.map((company) => (
              <div
                key={company.id}
                className="stagger-item glass-card p-4 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {company.name}
                    </p>
                    <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {company.billingAddress}
                    </p>
                  </div>
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold shrink-0"
                    style={{ background: "var(--accent-gradient)", color: "white" }}
                  >
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
            ))}
            {companies.length === 0 && (
              <p className="py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                No companies added yet.
              </p>
            )}
          </StaggerGrid>
        </GlassPanel>
      </section>
    </Shell>
  );
}
