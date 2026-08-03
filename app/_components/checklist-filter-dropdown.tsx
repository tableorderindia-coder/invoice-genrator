"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { normalizeMultiSelectValue } from "../../src/features/billing/filter-selection";

type ChecklistFilterOption = {
  value: string;
  label: string;
};

export type ChecklistFilterDropdownProps = {
  name: string;
  label: string;
  options: ChecklistFilterOption[];
  defaultSelectedValues?: string[];
  includeSelectAll?: boolean;
  emptyValue?: string;
  autoApplyOnClose?: boolean;
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
  emptyValue,
  autoApplyOnClose = false,
}: ChecklistFilterDropdownProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionValues = options.map((option) => option.value);
  const [open, setOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState<string[]>(() =>
    normalizeSelectedValues(defaultSelectedValues, optionValues),
  );
  const selectionAtOpenRef = useRef("");
  const selectedValuesRef = useRef(selectedValues);

  useEffect(() => {
    selectedValuesRef.current = selectedValues;
  }, [selectedValues]);

  const selectedSignature = useCallback(
    (values: string[]) => normalizeSelectedValues(values, optionValues).join("\u0000"),
    [optionValues],
  );

  const applySelectionIfChanged = useCallback(() => {
    if (
      !autoApplyOnClose ||
      selectionAtOpenRef.current === selectedSignature(selectedValuesRef.current)
    ) {
      return;
    }
    window.setTimeout(() => rootRef.current?.closest("form")?.requestSubmit(), 0);
  }, [autoApplyOnClose, selectedSignature]);

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

  useEffect(() => {
    if (!open) return;

    const close = (restoreFocus = false, applySelection = true) => {
      setOpen(false);
      if (applySelection) applySelectionIfChanged();
      if (restoreFocus) triggerRef.current?.focus();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        event.preventDefault();
        close(true);
      }
    };
    const handleClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        close(true);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
      }
    };
    const handleOtherDropdown = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== panelId) {
        close();
      }
    };
    const form = rootRef.current?.closest("form");

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("checklist-dropdown-open", handleOtherDropdown);
    const handleSubmit = () => close(false, false);
    form?.addEventListener("submit", handleSubmit);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("checklist-dropdown-open", handleOtherDropdown);
      form?.removeEventListener("submit", handleSubmit);
    };
  }, [applySelectionIfChanged, open, panelId]);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    const resetSelection = () => {
      setSelectedValues(normalizeSelectedValues(defaultSelectedValues, optionValues));
    };
    form?.addEventListener("reset", resetSelection);
    return () => form?.removeEventListener("reset", resetSelection);
  }, [defaultSelectedValues, optionValues]);

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
    <div ref={rootRef} className={`relative inline-flex min-w-[14rem] flex-col ${open ? "z-50" : "z-10"}`}>
      {visibleSelectedValues.length === 0 && emptyValue ? (
        <input type="hidden" name={name} value={emptyValue} />
      ) : null}
      {visibleSelectedValues.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}

      <button
        ref={triggerRef}
        type="button"
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            applySelectionIfChanged();
          } else {
            selectionAtOpenRef.current = selectedSignature(selectedValuesRef.current);
            setOpen(true);
            if (!open) {
              document.dispatchEvent(
                new CustomEvent("checklist-dropdown-open", { detail: panelId }),
              );
            }
          }
        }}
        className="checklist-filter-trigger inline-flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
      >
        <span className="truncate">{label}</span>
        <span
          className="checklist-filter-count rounded-full px-2 py-0.5 text-xs font-semibold"
        >
          {triggerLabel}
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={`${label} filters`}
          className="checklist-filter-panel absolute left-0 top-full z-[100] mt-2 max-h-[min(24rem,calc(100vh-6rem))] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border p-3 shadow-xl"
        >
          <div className="space-y-2">
            {includeSelectAll && options.length > 0 && (
              <label className="checklist-filter-option flex items-center gap-2 rounded-lg px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  data-auto-apply={autoApplyOnClose ? "false" : undefined}
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
                  className="checklist-filter-option flex items-center gap-2 rounded-lg px-2 py-1 text-sm"
                >
                  <input
                    type="checkbox"
                    data-auto-apply={autoApplyOnClose ? "false" : undefined}
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
