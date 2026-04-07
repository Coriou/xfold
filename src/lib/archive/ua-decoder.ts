// ---------------------------------------------------------------------------
// User-agent decoder — pure parsing
// ---------------------------------------------------------------------------
//
// Decodes the user-agent strings found in `key-registry.js` and `ni-devices.js`
// into structured device info. Twitter ships its own non-standard UA format
// alongside browser UAs, so we handle both.
//
// Supported inputs:
//   - Twitter native: `Twitter-iPhone/9.58.1 iOS/16.4.1 (Apple;iPhone11,2;;;;;1;2018)`
//   - Standard mobile: `Mozilla/5.0 (iPhone; CPU iPhone OS 16_5_1 like Mac OS X) ...`
//   - Standard desktop: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120 ...`
//
// The iPhone model code lookup table is bundled. It is not exhaustive — only
// codes for devices released since 2010 are mapped, and we lean toward popular
// mainstream models. Unknown codes resolve to the family ("iPhone") with a
// null model.
//
// No external dependencies; pure functions only. Fully unit-tested.
// ---------------------------------------------------------------------------

export type DeviceFamily =
  | "iPhone"
  | "iPad"
  | "Mac"
  | "Android"
  | "Windows"
  | "Linux"
  | "Unknown";

export interface DecodedUserAgent {
  /** The original UA string. */
  readonly raw: string;
  /** Broad device family. */
  readonly family: DeviceFamily;
  /** Marketing model name when known (e.g. "iPhone XR"). */
  readonly model: string | null;
  /** OS family + version when known (e.g. "iOS 16.4.1", "macOS 10.15.7"). */
  readonly os: string | null;
  /** Browser or app name (e.g. "Chrome 120", "Twitter for iPhone"). */
  readonly browser: string | null;
  /** Estimated device release year, when extractable from the UA. */
  readonly year: number | null;
}

// ---------------------------------------------------------------------------
// iPhone model code → marketing name table
// ---------------------------------------------------------------------------
//
// Apple's internal model codes follow `iPhoneN,M` (e.g. iPhone11,2 = iPhone XR).
// This table covers devices released ~2010 onward. Pulled from public Apple
// hardware identifier references; entries are flagged with the year of release
// so we can also surface "X-year-old phone" stats.

interface ModelEntry {
  readonly model: string;
  readonly year: number;
}

const IPHONE_MODELS: Readonly<Record<string, ModelEntry>> = {
  "iPhone3,1": { model: "iPhone 4", year: 2010 },
  "iPhone3,2": { model: "iPhone 4", year: 2010 },
  "iPhone3,3": { model: "iPhone 4", year: 2010 },
  "iPhone4,1": { model: "iPhone 4S", year: 2011 },
  "iPhone5,1": { model: "iPhone 5", year: 2012 },
  "iPhone5,2": { model: "iPhone 5", year: 2012 },
  "iPhone5,3": { model: "iPhone 5C", year: 2013 },
  "iPhone5,4": { model: "iPhone 5C", year: 2013 },
  "iPhone6,1": { model: "iPhone 5S", year: 2013 },
  "iPhone6,2": { model: "iPhone 5S", year: 2013 },
  "iPhone7,1": { model: "iPhone 6 Plus", year: 2014 },
  "iPhone7,2": { model: "iPhone 6", year: 2014 },
  "iPhone8,1": { model: "iPhone 6S", year: 2015 },
  "iPhone8,2": { model: "iPhone 6S Plus", year: 2015 },
  "iPhone8,4": { model: "iPhone SE (1st gen)", year: 2016 },
  "iPhone9,1": { model: "iPhone 7", year: 2016 },
  "iPhone9,2": { model: "iPhone 7 Plus", year: 2016 },
  "iPhone9,3": { model: "iPhone 7", year: 2016 },
  "iPhone9,4": { model: "iPhone 7 Plus", year: 2016 },
  "iPhone10,1": { model: "iPhone 8", year: 2017 },
  "iPhone10,2": { model: "iPhone 8 Plus", year: 2017 },
  "iPhone10,3": { model: "iPhone X", year: 2017 },
  "iPhone10,4": { model: "iPhone 8", year: 2017 },
  "iPhone10,5": { model: "iPhone 8 Plus", year: 2017 },
  "iPhone10,6": { model: "iPhone X", year: 2017 },
  "iPhone11,2": { model: "iPhone XS", year: 2018 },
  "iPhone11,4": { model: "iPhone XS Max", year: 2018 },
  "iPhone11,6": { model: "iPhone XS Max", year: 2018 },
  "iPhone11,8": { model: "iPhone XR", year: 2018 },
  "iPhone12,1": { model: "iPhone 11", year: 2019 },
  "iPhone12,3": { model: "iPhone 11 Pro", year: 2019 },
  "iPhone12,5": { model: "iPhone 11 Pro Max", year: 2019 },
  "iPhone12,8": { model: "iPhone SE (2nd gen)", year: 2020 },
  "iPhone13,1": { model: "iPhone 12 mini", year: 2020 },
  "iPhone13,2": { model: "iPhone 12", year: 2020 },
  "iPhone13,3": { model: "iPhone 12 Pro", year: 2020 },
  "iPhone13,4": { model: "iPhone 12 Pro Max", year: 2020 },
  "iPhone14,2": { model: "iPhone 13 Pro", year: 2021 },
  "iPhone14,3": { model: "iPhone 13 Pro Max", year: 2021 },
  "iPhone14,4": { model: "iPhone 13 mini", year: 2021 },
  "iPhone14,5": { model: "iPhone 13", year: 2021 },
  "iPhone14,6": { model: "iPhone SE (3rd gen)", year: 2022 },
  "iPhone14,7": { model: "iPhone 14", year: 2022 },
  "iPhone14,8": { model: "iPhone 14 Plus", year: 2022 },
  "iPhone15,2": { model: "iPhone 14 Pro", year: 2022 },
  "iPhone15,3": { model: "iPhone 14 Pro Max", year: 2022 },
  "iPhone15,4": { model: "iPhone 15", year: 2023 },
  "iPhone15,5": { model: "iPhone 15 Plus", year: 2023 },
  "iPhone16,1": { model: "iPhone 15 Pro", year: 2023 },
  "iPhone16,2": { model: "iPhone 15 Pro Max", year: 2023 },
  "iPhone17,1": { model: "iPhone 16 Pro", year: 2024 },
  "iPhone17,2": { model: "iPhone 16 Pro Max", year: 2024 },
  "iPhone17,3": { model: "iPhone 16", year: 2024 },
  "iPhone17,4": { model: "iPhone 16 Plus", year: 2024 },
};

const IPAD_MODELS: Readonly<Record<string, ModelEntry>> = {
  "iPad2,1": { model: "iPad 2", year: 2011 },
  "iPad3,1": { model: "iPad (3rd gen)", year: 2012 },
  "iPad4,1": { model: "iPad Air", year: 2013 },
  "iPad5,3": { model: "iPad Air 2", year: 2014 },
  "iPad6,3": { model: 'iPad Pro 9.7"', year: 2016 },
  "iPad6,7": { model: 'iPad Pro 12.9"', year: 2015 },
  "iPad7,1": { model: 'iPad Pro 12.9" (2nd gen)', year: 2017 },
  "iPad7,3": { model: 'iPad Pro 10.5"', year: 2017 },
  "iPad8,1": { model: 'iPad Pro 11"', year: 2018 },
  "iPad11,1": { model: "iPad mini (5th gen)", year: 2019 },
  "iPad13,1": { model: "iPad Air (4th gen)", year: 2020 },
  "iPad14,1": { model: "iPad mini (6th gen)", year: 2021 },
};

// ---------------------------------------------------------------------------
// Decoder
// ---------------------------------------------------------------------------

export function decodeUserAgent(ua: string): DecodedUserAgent {
  if (!ua) {
    return {
      raw: ua,
      family: "Unknown",
      model: null,
      os: null,
      browser: null,
      year: null,
    };
  }

  const native = decodeTwitterNative(ua);
  if (native) return native;

  return decodeStandardUA(ua);
}

// `Twitter-iPhone/9.58.1 iOS/16.4.1 (Apple;iPhone11,2;;;;;1;2018)`
function decodeTwitterNative(ua: string): DecodedUserAgent | null {
  const appMatch = ua.match(/^Twitter-(\w+)\/([\d.]*)/);
  if (!appMatch) return null;
  const appKind = appMatch[1] ?? "";
  const appVersion = appMatch[2] ?? "";

  const osMatch = ua.match(/(iOS|Android|MacOS)\/([\d._]+)/);
  const osFamily = osMatch?.[1] ?? null;
  const osVersion = osMatch?.[2]?.replace(/_/g, ".") ?? null;

  const detailsMatch = ua.match(/\(([^)]*)\)/);
  const details = detailsMatch?.[1]?.split(";") ?? [];
  const modelCode = details[1]?.trim() ?? "";
  // The trailing field is sometimes the year as a 4-digit number.
  let parsedYear: number | null = null;
  for (const part of details) {
    const trimmed = part.trim();
    if (/^\d{4}$/.test(trimmed)) {
      const n = Number(trimmed);
      if (n >= 2007 && n <= 2099) parsedYear = n;
    }
  }

  let family: DeviceFamily = "Unknown";
  let model: string | null = null;
  let year: number | null = parsedYear;

  if (modelCode.startsWith("iPhone")) {
    family = "iPhone";
    const entry = IPHONE_MODELS[modelCode];
    if (entry) {
      model = entry.model;
      if (year === null) year = entry.year;
    }
  } else if (modelCode.startsWith("iPad")) {
    family = "iPad";
    const entry = IPAD_MODELS[modelCode];
    if (entry) {
      model = entry.model;
      if (year === null) year = entry.year;
    }
  } else if (appKind === "Android") {
    family = "Android";
  } else if (appKind === "iPhone") {
    family = "iPhone";
  } else if (appKind === "iPad") {
    family = "iPad";
  }

  const os = osFamily && osVersion ? `${osFamily} ${osVersion}` : osFamily;
  const browser = appKind
    ? appVersion
      ? `Twitter for ${appKind} ${appVersion}`
      : `Twitter for ${appKind}`
    : null;

  return {
    raw: ua,
    family,
    model,
    os,
    browser,
    year,
  };
}

function decodeStandardUA(ua: string): DecodedUserAgent {
  let family: DeviceFamily = "Unknown";
  let os: string | null = null;

  // OS detection
  const iosMatch = ua.match(/iPhone OS ([\d_]+)/);
  const macMatch = ua.match(/Mac OS X ([\d_]+)/);
  const winMatch = ua.match(/Windows NT ([\d.]+)/);
  const androidMatch = ua.match(/Android ([\d.]+)/);

  if (iosMatch) {
    family = ua.includes("iPad") ? "iPad" : "iPhone";
    os = `iOS ${(iosMatch[1] ?? "").replace(/_/g, ".")}`;
  } else if (macMatch) {
    family = "Mac";
    os = `macOS ${(macMatch[1] ?? "").replace(/_/g, ".")}`;
  } else if (winMatch) {
    family = "Windows";
    const v = winMatch[1];
    os = v ? `Windows ${windowsName(v)}` : "Windows";
  } else if (androidMatch) {
    family = "Android";
    os = `Android ${androidMatch[1] ?? ""}`;
  } else if (ua.includes("Linux")) {
    family = "Linux";
    os = "Linux";
  }

  // Browser detection (order matters: Edge before Chrome before Safari)
  const edge = ua.match(/Edg(?:e|A|iOS)?\/([\d.]+)/);
  const firefox = ua.match(/Firefox\/([\d.]+)/);
  const chrome = ua.match(/(?:Chrome|CriOS)\/([\d.]+)/);
  const safari = ua.match(/Version\/([\d.]+).*Safari/);

  let browser: string | null = null;
  if (edge) browser = `Edge ${majorVersion(edge[1])}`;
  else if (firefox) browser = `Firefox ${majorVersion(firefox[1])}`;
  else if (chrome) browser = `Chrome ${majorVersion(chrome[1])}`;
  else if (safari) browser = `Safari ${majorVersion(safari[1])}`;

  // Standard browser UAs don't carry Apple model codes — we can't extract a
  // marketing model name without a vendor lookup table. Leave both null.
  return {
    raw: ua,
    family,
    model: null,
    os,
    browser,
    year: null,
  };
}

function majorVersion(v: string | undefined): string {
  if (!v) return "";
  return v.split(".")[0] ?? "";
}

function windowsName(v: string): string {
  // NT version → marketing name. Just the common ones.
  if (v.startsWith("10.0")) return "10/11";
  if (v.startsWith("6.3")) return "8.1";
  if (v.startsWith("6.2")) return "8";
  if (v.startsWith("6.1")) return "7";
  return v;
}
