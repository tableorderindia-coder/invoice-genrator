"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";

type NumericInputOptions = {
  precision: number;
  min?: number;
  max?: number;
};

export type NumericInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "inputMode" | "max" | "min" | "onChange" | "step" | "type" | "value"
> & {
  value?: string | number;
  defaultValue?: string | number;
  precision?: number;
  min?: number | string;
  max?: number | string;
  onValueChange?: (value: string) => void;
};

function displayNumericValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  const raw = String(value).trim();
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return raw;
  const [integerPart, decimalPart = ""] = raw.split(".");
  const integer = integerPart.replace(/^0+(?=\d)/, "") || "0";
  const decimal = decimalPart.replace(/0+$/, "");
  return decimal ? `${integer}.${decimal}` : integer;
}

export function normalizeNumericInput(
  rawValue: string,
  options: NumericInputOptions,
): { value: string; error: string | null } {
  const trimmed = rawValue.trim().replace(/,/g, "");
  if (!trimmed) return { value: "", error: null };
  if (!/^\d+(?:\.\d*)?$/.test(trimmed)) {
    return { value: rawValue, error: "Enter a valid number." };
  }

  const normalized = displayNumericValue(trimmed.replace(/\.$/, ""));
  const decimalLength = normalized.includes(".")
    ? normalized.length - normalized.indexOf(".") - 1
    : 0;
  if (decimalLength > options.precision) {
    return {
      value: normalized,
      error: `Use no more than ${options.precision} decimal places.`,
    };
  }

  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue)) {
    return { value: normalized, error: "Enter a valid number." };
  }
  if (options.min !== undefined && numericValue < options.min) {
    return { value: normalized, error: `Enter a value of at least ${options.min}.` };
  }
  if (options.max !== undefined && numericValue > options.max) {
    return { value: normalized, error: `Enter a value no greater than ${options.max}.` };
  }
  return { value: normalized, error: null };
}

export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  function NumericInput(
    {
      value,
      defaultValue,
      precision = 2,
      min,
      max,
      onValueChange,
      onBlur,
      onFocus,
      ...inputProps
    },
    forwardedRef,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const controlled = value !== undefined;
    const [focused, setFocused] = useState(false);
    const [rawValue, setRawValue] = useState(() =>
      displayNumericValue(controlled ? value : defaultValue),
    );

    useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

    const commit = (nextRawValue: string) => {
      const numericMin = min === undefined ? undefined : Number(min);
      const numericMax = max === undefined ? undefined : Number(max);
      const result = normalizeNumericInput(nextRawValue, {
        precision,
        min: Number.isFinite(numericMin) ? numericMin : undefined,
        max: Number.isFinite(numericMax) ? numericMax : undefined,
      });
      inputRef.current?.setCustomValidity(result.error ?? "");
      if (!result.error) {
        setRawValue(result.value);
        onValueChange?.(result.value);
      }
      return result;
    };

    return (
      <input
        {...inputProps}
        ref={inputRef}
        type="text"
        inputMode={precision === 0 ? "numeric" : "decimal"}
        value={controlled && !focused ? displayNumericValue(value) : rawValue}
        minLength={undefined}
        onChange={(event) => {
          const next = event.currentTarget.value.replace(/,/g, "");
          if (next === "" || /^\d*(?:\.\d*)?$/.test(next)) {
            inputRef.current?.setCustomValidity("");
            setRawValue(next);
            onValueChange?.(next);
          }
        }}
        onFocus={(event) => {
          if (controlled) setRawValue(displayNumericValue(value));
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          commit(event.currentTarget.value);
          setFocused(false);
          onBlur?.(event);
        }}
      />
    );
  },
);
