import { describe, expect, it } from "vitest";
import {
  formatHour,
  formatNumber,
  getDayLabel,
  parseDate,
  pluralize,
  toMonthKey,
  truncate,
} from "@/lib/format";

describe("formatNumber", () => {
  it("formats with US locale commas", () => {
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(1_000_000)).toBe("1,000,000");
  });
});

describe("pluralize", () => {
  it("uses singular for 1", () => {
    expect(pluralize(1, "tweet")).toBe("1 tweet");
  });

  it("auto-pluralizes by appending 's'", () => {
    expect(pluralize(0, "tweet")).toBe("0 tweets");
    expect(pluralize(2, "tweet")).toBe("2 tweets");
  });

  it("uses an explicit plural form when provided", () => {
    expect(pluralize(3, "person", "people")).toBe("3 people");
    expect(pluralize(1, "person", "people")).toBe("1 person");
  });

  it("formats large counts with commas", () => {
    expect(pluralize(2500, "tweet")).toBe("2,500 tweets");
  });
});

describe("parseDate", () => {
  it("returns null for empty input", () => {
    expect(parseDate("")).toBeNull();
  });

  it("parses ISO 8601 timestamps", () => {
    const d = parseDate("2024-01-15T10:30:00.000Z");
    expect(d).toBeInstanceOf(Date);
    expect(d?.getUTCFullYear()).toBe(2024);
  });

  it("parses Twitter custom date format", () => {
    const d = parseDate("Thu Mar 27 14:27:05 +0000 2026");
    expect(d).toBeInstanceOf(Date);
    expect(d?.getUTCFullYear()).toBe(2026);
  });

  it("parses dot-separated dates", () => {
    const d = parseDate("2024.03.15");
    expect(d).toBeInstanceOf(Date);
    expect(d?.getUTCFullYear()).toBe(2024);
  });

  it("returns null for unparseable input", () => {
    expect(parseDate("not a date")).toBeNull();
  });
});

describe("formatHour", () => {
  it("formats midnight as 12 AM", () => {
    expect(formatHour(0)).toBe("12 AM");
  });

  it("formats noon as 12 PM", () => {
    expect(formatHour(12)).toBe("12 PM");
  });

  it("formats morning hours", () => {
    expect(formatHour(1)).toBe("1 AM");
    expect(formatHour(11)).toBe("11 AM");
  });

  it("formats afternoon hours", () => {
    expect(formatHour(13)).toBe("1 PM");
    expect(formatHour(23)).toBe("11 PM");
  });
});

describe("getDayLabel", () => {
  it("returns short labels by default", () => {
    expect(getDayLabel(0)).toBe("Sun");
    expect(getDayLabel(6)).toBe("Sat");
  });

  it("returns full labels when requested", () => {
    expect(getDayLabel(0, true)).toBe("Sunday");
    expect(getDayLabel(3, true)).toBe("Wednesday");
  });

  it("returns empty string for out-of-range indices", () => {
    expect(getDayLabel(7)).toBe("");
    expect(getDayLabel(-1)).toBe("");
  });
});

describe("toMonthKey", () => {
  it("formats as YYYY-MM with zero-padded month", () => {
    expect(toMonthKey(new Date(Date.UTC(2024, 0, 15)))).toBe("2024-01");
    expect(toMonthKey(new Date(Date.UTC(2024, 11, 31)))).toBe("2024-12");
  });
});

describe("truncate", () => {
  it("returns input unchanged when shorter than limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("appends ellipsis when over limit", () => {
    expect(truncate("hello world", 5)).toBe("hell\u2026");
  });
});
