// ---------------------------------------------------------------------------
// Account summary helpers — canonical metrics shared across surfaces
// ---------------------------------------------------------------------------
//
// These helpers exist so that the Top Findings cards, the Privacy Erosion
// section, the X Eras share card, the Devices section, etc. all derive their
// "X years on X" / "Y devices fingerprinted" claims from the same place.
//
// Without this module the same archive used to produce three different "years
// on X" numbers (rounding from `Date.now()`, calendar-year span across data
// layers, span between first/last era) and two different "device count"
// numbers (sum of three categories vs. only encryption keys + push devices),
// which destroyed editorial trust on cross-reference.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "./types";
import { parseDate } from "@/lib/format";

/**
 * Reference "as of when" for time-relative insights. We use the archive's
 * generation date so the same archive always produces the same numbers
 * regardless of when the user opens it. Falls back to "now" if the
 * generation date is missing or unparseable.
 */
export function getReferenceDate(archive: ParsedArchive): Date {
  return parseDate(archive.meta.generationDate) ?? new Date();
}

/**
 * Canonical "years on X" — rounded years between account creation and the
 * archive's reference date. Returns null if account creation isn't known.
 *
 * Use this everywhere a "{N} years on X" / "over {N} years" claim appears,
 * so the same archive can't produce 17, 18, *and* 15 across surfaces.
 */
export function getYearsOnX(archive: ParsedArchive): number | null {
  const created = archive.account?.createdAt;
  if (!created) return null;
  const createdDate = parseDate(created);
  if (!createdDate) return null;

  const ref = getReferenceDate(archive);
  const ms = ref.getTime() - createdDate.getTime();
  if (ms <= 0) return 0;
  return Math.round(ms / (1000 * 60 * 60 * 24 * 365.25));
}

/**
 * Differentiates the three categories of "devices" X tracks. The total is
 * sometimes presented as a single "devices fingerprinted" number, but the
 * three categories are very different things and conflating them in copy
 * is misleading:
 *
 *  - **App tokens** — OAuth / app authorization grants. NOT physical devices.
 *    "Twitter for iPhone", "Twitter for iPad" each get a token even if the
 *    user only has one device. Re-authorizations create new rows.
 *  - **Push devices** — real notification endpoints. The closest thing to a
 *    "physical device" entry in the archive (UDIDs, carrier, phone numbers).
 *  - **Encryption keys** — per-browser/device E2E identifiers (one per
 *    browser tab in some cases). More device-like than app tokens, but
 *    still not 1:1 with hardware.
 */
export interface DeviceBreakdown {
  readonly appTokens: number;
  readonly pushDevices: number;
  readonly encryptionKeys: number;
  /** Sum of all three — useful as a "device-related identifiers" total. */
  readonly total: number;
}

export function getDeviceBreakdown(archive: ParsedArchive): DeviceBreakdown {
  const appTokens = archive.deviceTokens.length;
  const pushDevices = archive.niDevices.length;
  const encryptionKeys = archive.keyRegistryDevices.length;
  return {
    appTokens,
    pushDevices,
    encryptionKeys,
    total: appTokens + pushDevices + encryptionKeys,
  };
}
