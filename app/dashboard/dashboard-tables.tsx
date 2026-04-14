"use client";

import { useEffect, useMemo, useState } from "react";
import { PendingActionButton } from "../_components/pending-action-button";
import { PendingSubmitButton } from "../_components/pending-submit-button";
import { inputClass } from "../_components/field";
import type {
  PnDashboardData,
  PnEmployeeEditableRow,
  PnPeriodRow,
  PnPeriodType,
} from "@/src/features/billing/types";
import {
  formatInr,
  formatMonthYear,
  formatSignedInr,
  formatUsd,
} from "@/src/features/billing/utils";
import { getVisibleToggleColumns } from "@/src/features/billing/dashboard-column-visibility";

type DashboardTablesProps = {
  view: "employee" | "period";
  periodType: PnPeriodType;
  data: PnDashboardData;
  selectedCompanyId: string;
  returnTo: string;
  saveDashboardExpenseAction: (formData: FormData) => Promise<void>;
  updateDashboardEmployeeCashFlowEntryAction: (formData: FormData) => Promise<void>;
};

export function DashboardTables({
  view,
  periodType,
  data,
  selectedCompanyId,
  returnTo,
  saveDashboardExpenseAction,
  updateDashboardEmployeeCashFlowEntryAction,
}: DashboardTablesProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("dashboardShowDetails");
    if (saved) {
      try {
        setShowDetails(JSON.parse(saved));
      } catch {
        setShowDetails(false);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("dashboardShowDetails", JSON.stringify(showDetails));
  }, [showDetails]);

  const toggleColumns = useMemo(
    () => getVisibleToggleColumns(showDetails),
    [showDetails],
  );

  const toggleButton = (
    <button
      type="button"
      onClick={() => setShowDetails((prev) => !prev)}
      className="btn-outline"
      title="Toggle Details"
    >
      {showDetails ? "🙈 Hide details" : "👁 Show details"}
    </button>
  );

  if (view === "employee") {
    return (
      <EmployeeTables
        data={data}
        returnTo={returnTo}
        toggleColumns={toggleColumns}
        toggleButton={toggleButton}
        updateDashboardEmployeeCashFlowEntryAction={updateDashboardEmployeeCashFlowEntryAction}
      />
    );
  }

  return (
    <PeriodTables
      data={data}
      periodType={periodType}
      selectedCompanyId={selectedCompanyId}
      returnTo={returnTo}
      toggleColumns={toggleColumns}
      toggleButton={toggleButton}
      saveDashboardExpenseAction={saveDashboardExpenseAction}
    />
  );
}

type ToggleColumn = ReturnType<typeof getVisibleToggleColumns>[number];

type EmployeeTablesProps = {
  data: PnDashboardData;
  returnTo: string;
  toggleColumns: ToggleColumn[];
  toggleButton: React.ReactNode;
  updateDashboardEmployeeCashFlowEntryAction: (formData: FormData) => Promise<void>;
};

function EmployeeTables({
  data,
  returnTo,
  toggleColumns,
  toggleButton,
  updateDashboardEmployeeCashFlowEntryAction,
}: EmployeeTablesProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">{toggleButton}</div>
      {data.employeeEditableSections.map((section) => (
        <div key={section.employeeId} />
      ))}
    </div>
  );
}

type PeriodTablesProps = {
  data: PnDashboardData;
  periodType: PnPeriodType;
  selectedCompanyId: string;
  returnTo: string;
  toggleColumns: ToggleColumn[];
  toggleButton: React.ReactNode;
  saveDashboardExpenseAction: (formData: FormData) => Promise<void>;
};

function PeriodTables({
  data,
  periodType,
  selectedCompanyId,
  returnTo,
  toggleColumns,
  toggleButton,
  saveDashboardExpenseAction,
}: PeriodTablesProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">{toggleButton}</div>
      {data.periodRows.map(() => null)}
    </div>
  );
}

