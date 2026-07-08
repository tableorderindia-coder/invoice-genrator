"use client";

import { useMemo, useState } from "react";

import { inputClass } from "@/app/_components/field";

type CompanyOption = {
  id: string;
  name: string;
};

export function CompanyAccessPicker({
  companies,
  defaultCompanyIds = [],
  disabled = false,
}: {
  companies: CompanyOption[];
  defaultCompanyIds?: string[];
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set(defaultCompanyIds));
  const visibleCompanies = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return companies;
    }

    return companies.filter((company) =>
      company.name.toLowerCase().includes(normalized),
    );
  }, [companies, query]);

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={inputClass}
        placeholder="Search companies"
        disabled={disabled}
      />

      <div
        className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border p-3"
        style={{ borderColor: "var(--glass-border)" }}
      >
        {visibleCompanies.map((company) => {
          const checked = selected.has(company.id);

          return (
            <label
              key={company.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              <input
                type="checkbox"
                name="companyAccess"
                value={company.id}
                checked={checked}
                disabled={disabled}
                onChange={(event) => {
                  setSelected((current) => {
                    const next = new Set(current);
                    if (event.currentTarget.checked) {
                      next.add(company.id);
                    } else {
                      next.delete(company.id);
                    }
                    return next;
                  });
                }}
              />
              <span>{company.name}</span>
            </label>
          );
        })}

        {visibleCompanies.length === 0 ? (
          <p className="px-3 py-4 text-sm" style={{ color: "var(--text-muted)" }}>
            No companies match this search.
          </p>
        ) : null}
      </div>
    </div>
  );
}
