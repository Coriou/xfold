// ---------------------------------------------------------------------------
// Formatting utilities
// ---------------------------------------------------------------------------

/** Parse the archive's inconsistent date formats into a Date */
export function parseDate(str: string): Date | null {
  if (!str) return null;

  // The archive ships dates in three formats:
  //   ISO 8601:        "2025-01-25T15:36:13.409Z"
  //   Twitter custom:  "Thu Mar 27 14:27:05 +0000 2026"
  //   Dot format:      "2024.03.15"
  //
  // Try the input as-is first — that handles ISO 8601 (including the dots
  // in the milliseconds component) and Twitter custom in one shot. Only
  // fall back to dot-replacement for the YYYY.MM.DD case.
  const direct = new Date(str);
  if (!isNaN(direct.getTime())) return direct;

  const dotted = new Date(str.replace(/\./g, "-"));
  return isNaN(dotted.getTime()) ? null : dotted;
}

/** Format a date string to "Oct 10, 2012" */
export function formatDate(str: string): string {
  const d = parseDate(str);
  if (!d) return str;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a date string to "Oct 10, 2012, 3:45 PM" */
export function formatDateTime(str: string): string {
  const d = parseDate(str);
  if (!d) return str;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Format number with locale-aware commas */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/** Truncate string with ellipsis */
export function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + "\u2026";
}

/** Pluralize: "1 app" vs "17 apps" */
export function pluralize(
  count: number,
  singular: string,
  plural?: string,
): string {
  const word = count === 1 ? singular : (plural ?? singular + "s");
  return `${formatNumber(count)} ${word}`;
}

/** Day-of-week label (0 = Sunday) */
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_LABELS_FULL = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

export function getDayLabel(dayIndex: number, full?: boolean): string {
  return (full ? DAY_LABELS_FULL : DAY_LABELS)[dayIndex] ?? "";
}

/** Format hour as "12 AM", "1 PM", etc. */
export function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

/**
 * Return the hour-of-day (0-23) for a Date in the given IANA timezone.
 *
 * Used by hour-of-day insights so a user who tweeted from EST and views
 * from PST sees their *actual* tweeting hours, not their viewer-local ones.
 *
 * Falls back to runtime-local `getHours()` if no timezone is provided or
 * the timezone is not a valid IANA identifier.
 */
export function getHourInTimezone(
  date: Date,
  timezone: string | null | undefined,
): number {
  if (!timezone) return date.getHours();
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hourCycle: "h23",
    });
    const hour = parseInt(fmt.format(date), 10);
    if (Number.isFinite(hour) && hour >= 0 && hour <= 23) return hour;
  } catch {
    // Fall through to runtime hours
  }
  return date.getHours();
}

/** Format a Date as "YYYY-MM" for monthly bucketing */
export function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Human-readable account age: "13 years, 4 months" */
export function formatAccountAge(createdAt: string): string {
  const d = parseDate(createdAt);
  if (!d) return "";
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  let months = now.getMonth() - d.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  return parts.join(", ") || "less than a month";
}

/** Extract browser/OS from a User-Agent string */
export function parseUserAgent(ua: string): string {
  // Try common patterns
  const chrome = ua.match(/Chrome\/([\d.]+)/);
  const firefox = ua.match(/Firefox\/([\d.]+)/);
  const safari = ua.match(/Version\/([\d.]+).*Safari/);
  const edge = ua.match(/Edg\/([\d.]+)/);

  let browser = "Unknown";
  if (edge) browser = `Edge ${edge[1]?.split(".")[0] ?? ""}`;
  else if (chrome) browser = `Chrome ${chrome[1]?.split(".")[0] ?? ""}`;
  else if (firefox) browser = `Firefox ${firefox[1]?.split(".")[0] ?? ""}`;
  else if (safari) browser = `Safari ${safari[1]?.split(".")[0] ?? ""}`;

  let os = "";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS X") || ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  return os ? `${browser} / ${os}` : browser;
}
