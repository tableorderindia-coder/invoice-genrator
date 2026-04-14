export type ToggleColumnKey =
  | "dollarInward"
  | "onboardingAdvance"
  | "reimbursements"
  | "reimbursementLabels"
  | "reimbursementsInr"
  | "appraisalAdvance"
  | "appraisalAdvanceInr"
  | "offboardingDeduction"
  | "effectiveDollarInward";

export type ToggleColumn = {
  key: ToggleColumnKey;
  label: string;
};

const leftFixed: ToggleColumn[] = [
  { key: "dollarInward", label: "Dollar inward" },
];

const middleExpandable: ToggleColumn[] = [
  { key: "onboardingAdvance", label: "Onboarding advance" },
  { key: "reimbursements", label: "Employee reimbursements (USD)" },
  { key: "reimbursementLabels", label: "Employee reimbursement labels" },
  { key: "reimbursementsInr", label: "Employee reimbursements (INR)" },
  { key: "appraisalAdvance", label: "Appraisal advance" },
  { key: "appraisalAdvanceInr", label: "Appraisal advance (INR)" },
  { key: "offboardingDeduction", label: "Offboarding deduction" },
];

const rightFixed: ToggleColumn[] = [
  { key: "effectiveDollarInward", label: "Effective dollar inward" },
];

export function getVisibleToggleColumns(showDetails: boolean) {
  return [
    ...leftFixed,
    ...(showDetails ? middleExpandable : []),
    ...rightFixed,
  ];
}
