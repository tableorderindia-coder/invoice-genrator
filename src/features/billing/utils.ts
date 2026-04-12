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

export function formatDate(value: string | Date) {
  const parsedDate = parseDateValue(value);
  if (!parsedDate) {
    return typeof value === "string" ? value : "";
  }

  const month = String(parsedDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsedDate.getUTCDate()).padStart(2, "0");
  const year = parsedDate.getUTCFullYear();
  return `${month}-${day}-${year}`;
}

export function normalizeDateRange(value: string) {
  return value.replace(
    /\b(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{4})\b/g,
    (token) => formatDate(token),
  );
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

export function sanitizeDownloadFilename(value: string) {
  const sanitized = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .replace(/^[-.\s]+|[-.\s]+$/g, "");

  return sanitized || "invoice";
}

function parseDateValue(value: string | Date) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return undefined;
    }
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const slashOrHyphenMatch = value.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (slashOrHyphenMatch) {
    const [, month, day, year] = slashOrHyphenMatch;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const fallback = new Date(value);
  if (Number.isNaN(fallback.getTime())) {
    return undefined;
  }

  return new Date(
    Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), fallback.getUTCDate()),
  );
}
