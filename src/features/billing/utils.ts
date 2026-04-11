export function centsFromUsd(input: string) {
  const normalized = Number.parseFloat(input || "0");
  if (Number.isNaN(normalized)) {
    return 0;
  }

  return Math.round(normalized * 100);
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatInr(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatSignedInr(cents: number) {
  if (cents > 0) {
    return `+ ${formatInr(cents)}`;
  }
  if (cents < 0) {
    return `- ${formatInr(Math.abs(cents))}`;
  }
  return formatInr(0);
}

export function formatMonthYear(month: number, year: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function getDaysInMonth(month: number, year: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Month must be between 1 and 12.");
  }
  if (!Number.isInteger(year) || year <= 0) {
    throw new Error("Year must be a positive integer.");
  }

  return new Date(year, month, 0).getDate();
}
