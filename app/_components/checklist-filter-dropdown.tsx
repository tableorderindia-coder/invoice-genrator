"use client";

import { useId, useState } from "react";

import { normalizeMultiSelectValue } from "../../src/features/billing/filter-selection";

export type ChecklistFilterOption = {
  value: string;
  label: string;
};

export type ChecklistFilterDropdownProps = {
  name: string;
  label: string;
  options: ChecklistFilterOption[];
  defaultSelectedValues?: string[];
  includeSelectAll?: boolean;
};

type TriggerLabelInput = {
  label: string;
  selectedCount: number;
  optionCount: number;
};

function normalizeSelectedValues(
  selectedValues: string[],
  optionValues: string[],
) {
  const optionValueSet = new Set(optionValues);
  return normalizeMultiSelectValue(selectedValues).filter((value) =>
    optionValueSet.has(value),
  );
}

export function getChecklistFilterTriggerLabel(input: TriggerLabelInput) {
  if (input.optionCount === 0) {
    return `No ${input.label}s`;
  }

  if (input.selectedCount >= input.optionCount) {
    return "All";
  }

  return `${input.selectedCount} selected`;
}

export function ChecklistFilterDropdown({
  name,
  label,
  options,
  defaultSelectedValues = [],
  includeSelectAll = false,
}: ChecklistFilterDropdownProps) {
  const panelId = useId();
  const optionValues = options.map((option) => option.value);
  const [open, setOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<string[]>(() =>
    normalizeSelectedValues(defaultSelectedValues, optionValues),
  );

  const selectedValueSet = new Set(selectedValues);
  const visibleSelectedValues = options
    .map((option) => option.value)
    .filter((value) => selectedValueSet.has(value));
  const triggerLabel = getChecklistFilterTriggerLabel({
    label,
    selectedCount: visibleSelectedValues.length,
    optionCount: optionValues.length,
  });
  const allSelected =
    optionValues.length > 0 &&
    optionValues.every((value) => selectedValueSet.has(value));

  function setOptionValue(value: string, checked: boolean) {
    setSelectedValues((currentValues) => {
      const nextValues = checked
        ? [...currentValues, value]
        : currentValues.filter((currentValue) => currentValue !== value);
      return normalizeSelectedValues(nextValues, optionValues);
    });
  }

  function setAllValues(checked: boolean) {
    setSelectedValues(checked ? optionValues : []);
  }

  return (
    <div className={`relative inline-flex min-w-[14rem] flex-col ${open ? "z-50" : "z-10"}`}>
      {visibleSelectedValues.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}

      <button
        type="button"
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
        style={{
          borderColor: "var(--glass-border)",
          background: "rgba(255, 255, 255, 0.04)",
          color: "var(--text-primary)",
        }}
      >
        <span className="truncate">{label}</span>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            color: "var(--text-secondary)",
          }}
        >
          {triggerLabel}
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={`${label} filters`}
          className="absolute left-0 top-full z-[100] mt-2 w-72 rounded-2xl border p-3 shadow-xl"
          style={{
            borderColor: "var(--glass-border)",
            background: "rgba(15, 17, 24, 0.98)",
            color: "var(--text-primary)",
          }}
        >
          <div className="space-y-2">
            {includeSelectAll && options.length > 0 && (
              <label className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => setAllValues(event.target.checked)}
                />
                <span>Select all</span>
              </label>
            )}

            {options.length > 0 ? (
              options.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedValueSet.has(option.value)}
                    onChange={(event) => setOptionValue(option.value, event.target.checked)}
                  />
                  <span>{option.label}</span>
                </label>
              ))
            ) : (
              <p className="px-2 py-1 text-sm" style={{ color: "var(--text-muted)" }}>
                No {label}s available.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
