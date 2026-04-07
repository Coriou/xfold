// ---------------------------------------------------------------------------
// Algorithmic Mirror — "Who X thinks you are"
// ---------------------------------------------------------------------------
//
// Assembles all inferred data (gender, age, interests, shows, languages,
// lookalike targets, hidden demographics from ad targeting, location) into
// a structured profile that reflects back exactly who X's algorithm thinks
// the user is — like a dating profile written by a surveillance company.
//
// The insight cross-references personalization, ad impressions, and
// engagement targeting criteria to surface demographic inferences X never
// shows in its own UI.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";
import { buildAdvertiserStats } from "./advertiser-stats";

// --- Types ------------------------------------------------------------------

export interface AlgorithmicMirror {
  /** Inferred gender, if available. */
  readonly gender: string | null;
  /** Inferred age range from personalization + ad targeting. */
  readonly ageRange: string | null;
  /** Location derived from account + ad targeting. */
  readonly location: string | null;
  /** Languages X thinks the user speaks. */
  readonly languages: readonly string[];
  /** Top inferred interests (capped at 12 for display). */
  readonly topInterests: readonly string[];
  /** Total number of inferred interests. */
  readonly totalInterests: number;
  /** TV shows / media X associates with the user (capped at 8). */
  readonly topShows: readonly string[];
  /** Total shows tracked. */
  readonly totalShows: number;
  /** Lookalike targets — "you look like someone who follows @X". */
  readonly lookalikeTargets: readonly string[];
  /** Hidden demographic inferences from ad targeting. */
  readonly hiddenDemographics: readonly MirrorDemographic[];
  /** The top advertiser pursuing this user. */
  readonly topAdvertiser: string | null;
  /** How many unique advertisers targeted this user. */
  readonly uniqueAdvertisers: number;
  /** How long X has been building this profile. */
  readonly profileAgeDays: number;
  /** Account creation date for display. */
  readonly memberSince: string | null;
  /** A generated one-line bio X would write for this user. */
  readonly generatedBio: string;
  /** Key absurdities — strange inferences that make good screenshots. */
  readonly absurdities: readonly string[];
}

export interface MirrorDemographic {
  readonly type: string;
  readonly value: string;
}

// --- Targeting types that reveal hidden demographic slots -------------------

const HIDDEN_DEMO_TYPES: ReadonlySet<string> = new Set([
  "Income range",
  "Job title",
  "Education",
  "Relationship status",
  "Homeownership",
  "Behaviors",
  "Purchase behavior",
  "Life events",
]);

// --- Builder ----------------------------------------------------------------

export function buildAlgorithmicMirror(
  archive: ParsedArchive,
): AlgorithmicMirror | null {
  const p = archive.personalization;
  // Need at least personalization OR ad data to build a mirror
  if (!p && archive.adImpressions.length === 0) return null;

  // --- Gender & age ---
  const gender = p?.gender ?? null;

  // Ad targeting may give a more specific age than personalization
  const ageFromPersonalization = p?.inferredAge ?? null;
  const ageFromAds = extractMostCommonTargetingValue(archive, "Age");
  const ageRange = ageFromPersonalization ?? ageFromAds;

  // --- Location ---
  const locationFromAds = extractMostCommonTargetingValue(archive, "Locations");
  const locationFromProfile = archive.profile?.location ?? null;
  const location = locationFromAds ?? locationFromProfile;

  // --- Languages ---
  const languages = (p?.languages ?? [])
    .filter((l) => !l.isDisabled)
    .map((l) => l.language);

  // --- Interests ---
  const allInterests = (p?.interests ?? [])
    .filter((i) => !i.isDisabled)
    .map((i) => i.name);
  const topInterests = allInterests.slice(0, 12);

  // --- Shows ---
  const shows = p?.shows ?? [];
  const topShows = shows.slice(0, 8);

  // --- Lookalike targets ---
  const lookalikeTargets = extractLookalikeTargets(archive);

  // --- Hidden demographics from ad targeting ---
  const hiddenDemographics = extractHiddenDemographicsForMirror(archive);

  // --- Advertiser stats ---
  const adStats = buildAdvertiserStats(archive, 1);
  const topAdvertiser =
    adStats.top.length > 0 ? (adStats.top[0]?.name ?? null) : null;

  // --- Profile age ---
  const createdAt = archive.account?.createdAt ?? null;
  const createdDate = createdAt ? parseDate(createdAt) : null;
  const profileAgeDays = createdDate
    ? Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // --- Generated bio ---
  const generatedBio = buildGeneratedBio({
    gender,
    ageRange,
    location,
    languages,
    topInterests: allInterests,
    shows,
    lookalikeTargets,
  });

  // --- Absurdities ---
  const absurdities = findAbsurdities({
    languages,
    shows,
    interests: allInterests,
    lookalikeTargets,
    hiddenDemographics,
  });

  return {
    gender,
    ageRange,
    location,
    languages,
    topInterests,
    totalInterests: allInterests.length,
    topShows,
    totalShows: shows.length,
    lookalikeTargets,
    hiddenDemographics,
    topAdvertiser,
    uniqueAdvertisers: adStats.uniqueAdvertisers,
    profileAgeDays,
    memberSince: createdAt,
    generatedBio,
    absurdities,
  };
}

// --- Helpers ----------------------------------------------------------------

function extractMostCommonTargetingValue(
  archive: ParsedArchive,
  targetingType: string,
): string | null {
  const counts = new Map<string, number>();

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const crit of imp.targetingCriteria) {
        if (crit.targetingType === targetingType && crit.targetingValue) {
          counts.set(
            crit.targetingValue,
            (counts.get(crit.targetingValue) ?? 0) + 1,
          );
        }
      }
    }
  }

  if (counts.size === 0) return null;

  let best: string | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function extractLookalikeTargets(archive: ParsedArchive): string[] {
  const targets = new Map<string, number>();

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const crit of imp.targetingCriteria) {
        if (
          crit.targetingType === "Follower look-alikes" &&
          crit.targetingValue
        ) {
          targets.set(
            crit.targetingValue,
            (targets.get(crit.targetingValue) ?? 0) + 1,
          );
        }
      }
    }
  }

  // Also include personalization lookalikes
  const pLookalikes = archive.personalization?.lookalikeAdvertisers ?? [];
  for (const name of pLookalikes) {
    if (!targets.has(name)) {
      targets.set(name, 1);
    }
  }

  return [...targets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);
}

function extractHiddenDemographicsForMirror(
  archive: ParsedArchive,
): MirrorDemographic[] {
  const seen = new Set<string>();
  const results: MirrorDemographic[] = [];

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const crit of imp.targetingCriteria) {
        if (HIDDEN_DEMO_TYPES.has(crit.targetingType) && crit.targetingValue) {
          const key = `${crit.targetingType}::${crit.targetingValue}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              type: crit.targetingType,
              value: crit.targetingValue,
            });
          }
        }
      }
    }
  }

  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) {
      for (const crit of eng.targetingCriteria) {
        if (HIDDEN_DEMO_TYPES.has(crit.targetingType) && crit.targetingValue) {
          const key = `${crit.targetingType}::${crit.targetingValue}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({
              type: crit.targetingType,
              value: crit.targetingValue,
            });
          }
        }
      }
    }
  }

  return results.slice(0, 10);
}

interface BioParams {
  gender: string | null;
  ageRange: string | null;
  location: string | null;
  languages: readonly string[];
  topInterests: readonly string[];
  shows: readonly string[];
  lookalikeTargets: readonly string[];
}

function buildGeneratedBio(params: BioParams): string {
  const parts: string[] = [];

  // Identity fragment
  const identityParts: string[] = [];
  if (params.gender) identityParts.push(capitalize(params.gender));
  if (params.ageRange) identityParts.push(params.ageRange);
  if (params.location) identityParts.push(`from ${params.location}`);
  if (identityParts.length > 0) {
    parts.push(identityParts.join(", ") + ".");
  }

  // Interests snippet
  if (params.topInterests.length > 0) {
    const displayed = params.topInterests.slice(0, 3);
    parts.push(`Into ${displayed.join(", ")}.`);
  }

  // Shows/media
  if (params.shows.length > 0) {
    const displayed = params.shows.slice(0, 2);
    parts.push(`Watches ${displayed.join(" and ")}.`);
  }

  // Languages
  const realLanguages = params.languages.filter(
    (l) => l !== "No linguistic content",
  );
  if (realLanguages.length > 1) {
    parts.push(`Speaks ${realLanguages.join(", ")}.`);
  }

  // Lookalike
  if (params.lookalikeTargets.length > 0) {
    parts.push(`Looks like a ${params.lookalikeTargets[0]} follower.`);
  }

  return parts.join(" ") || "X hasn't built a profile on you yet.";
}

function findAbsurdities(params: {
  languages: readonly string[];
  shows: readonly string[];
  interests: readonly string[];
  lookalikeTargets: readonly string[];
  hiddenDemographics: readonly MirrorDemographic[];
}): string[] {
  const results: string[] = [];

  // "No linguistic content" as a language is pure absurdity
  if (params.languages.includes("No linguistic content")) {
    results.push(
      'X thinks you speak "No linguistic content" — yes, that\'s a real language in their system.',
    );
  }

  // Being a lookalike of very different accounts
  if (params.lookalikeTargets.length >= 3) {
    const first = params.lookalikeTargets[0];
    const last = params.lookalikeTargets[params.lookalikeTargets.length - 1];
    if (first && last) {
      results.push(
        `Advertisers think you're simultaneously a ${first} and a ${last} type.`,
      );
    }
  }

  // Contradictory-sounding interests
  const interestSet = new Set(params.interests.map((i) => i.toLowerCase()));
  if (
    interestSet.has("cryptocurrency") &&
    interestSet.has("financial planning")
  ) {
    results.push(
      'X filed you under both "Cryptocurrency" and "Financial planning" — make up your mind.',
    );
  }

  // Hidden demographics that feel invasive
  for (const demo of params.hiddenDemographics) {
    if (demo.type === "Income range" || demo.type === "Homeownership") {
      results.push(
        `Advertisers targeted you as "${demo.value}" — a category X never shows you in settings.`,
      );
      break;
    }
  }

  return results.slice(0, 4);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
