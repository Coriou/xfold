// ---------------------------------------------------------------------------
// Shadow profile — "What you shared" vs "What X inferred"
// ---------------------------------------------------------------------------
//
// Builds two parallel data models:
//   1. Explicit data — things the user deliberately provided (bio, email,
//      phone, birthday, location, tweets, likes, contacts).
//   2. Inferred data — things X built from behavior without asking (gender,
//      age, interests, languages, installed apps, location history,
//      partner interests, audience lists, ad targeting demographics).
//
// Then cross-references ad targeting criteria to extract advertiser-visible
// inferences (income, job, education, life events) that X assigned but
// never surfaced in the personalization section — they only appear as
// targeting criteria values.
//
// Note: we deliberately do NOT call these "hidden" — the targeting type
// list is incomplete (X has dozens more), and "advertiser-visible" is the
// honest framing.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import {
  buildCorpus,
  isInterestConfirmed,
} from "@/lib/archive/interest-matching";

// --- Types ------------------------------------------------------------------

export interface ShadowProfileEntry {
  readonly label: string;
  readonly value: string;
  /** Whether X inferred this or the user explicitly provided it. */
  readonly source: "explicit" | "inferred";
  /** Higher = more privacy-invasive. */
  readonly severity: "low" | "medium" | "high";
  /** Optional category tag for grouping. */
  readonly category: ShadowCategory;
}

export type ShadowCategory =
  | "identity"
  | "demographics"
  | "location"
  | "behavior"
  | "tracking"
  | "monetization";

export interface ShadowProfile {
  /** Things the user explicitly provided to X. */
  readonly explicit: readonly ShadowProfileEntry[];
  /** Things X inferred or third parties provided. */
  readonly inferred: readonly ShadowProfileEntry[];
  /** Summary counts */
  readonly explicitCount: number;
  readonly inferredCount: number;
  /** How much bigger the inferred profile is vs explicit — a ratio. */
  readonly inferredRatio: number;
  /**
   * Advertiser-visible demographic inferences (income range, job title,
   * life events, etc.) extracted from ad targeting criteria. These don't
   * appear in the personalization page — only advertisers see them.
   */
  readonly advertiserDemographics: readonly AdvertiserDemographic[];
  /** Interests X assigned with no behavioral evidence in tweets/likes. */
  readonly unconfirmedInterestCount: number;
  /** Total interests assigned. */
  readonly totalInterestCount: number;
}

export interface AdvertiserDemographic {
  readonly type: string;
  readonly value: string;
  /** How many advertisers used this criterion to target the user. */
  readonly advertiserCount: number;
}

// --- Advertiser-visible demographics extraction -----------------------------

/**
 * Targeting types that reveal demographic inferences X never surfaces in
 * the personalization section. These only appear as ad-targeting criteria.
 *
 * This list is intentionally a starter set — X exposes ~50+ targeting
 * types and our coverage is the most-impactful subset, not exhaustive.
 */
const DEMOGRAPHIC_TARGETING_TYPES = new Set([
  "Conversation topics",
  "Events",
  "Follower look-alikes",
  "Income range",
  "Job title",
  "Education",
  "Relationship status",
  "Homeownership",
  "TV shows",
  "Movies",
  "Life events",
  "Behaviors",
  "Purchase behavior",
]);

function extractAdvertiserDemographics(
  archive: ParsedArchive,
): AdvertiserDemographic[] {
  const map = new Map<
    string,
    { type: string; value: string; advs: Set<string> }
  >();

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const crit of imp.targetingCriteria) {
        if (
          DEMOGRAPHIC_TARGETING_TYPES.has(crit.targetingType) &&
          crit.targetingValue
        ) {
          const key = `${crit.targetingType}::${crit.targetingValue}`;
          const existing = map.get(key);
          if (existing) {
            existing.advs.add(imp.advertiserScreenName);
          } else {
            map.set(key, {
              type: crit.targetingType,
              value: crit.targetingValue,
              advs: new Set([imp.advertiserScreenName]),
            });
          }
        }
      }
    }
  }

  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) {
      for (const crit of eng.targetingCriteria) {
        if (
          DEMOGRAPHIC_TARGETING_TYPES.has(crit.targetingType) &&
          crit.targetingValue
        ) {
          const key = `${crit.targetingType}::${crit.targetingValue}`;
          const existing = map.get(key);
          if (existing) {
            existing.advs.add(eng.advertiserScreenName);
          } else {
            map.set(key, {
              type: crit.targetingType,
              value: crit.targetingValue,
              advs: new Set([eng.advertiserScreenName]),
            });
          }
        }
      }
    }
  }

  return [...map.values()]
    .map((e) => ({
      type: e.type,
      value: e.value,
      advertiserCount: e.advs.size,
    }))
    .sort((a, b) => b.advertiserCount - a.advertiserCount);
}

// --- Builder ----------------------------------------------------------------

export function buildShadowProfile(archive: ParsedArchive): ShadowProfile {
  const explicit: ShadowProfileEntry[] = [];
  const inferred: ShadowProfileEntry[] = [];

  // --- Explicit data (user-provided) ----------------------------------------

  if (archive.account?.email) {
    explicit.push({
      label: "Email",
      value: archive.account.email,
      source: "explicit",
      severity: "medium",
      category: "identity",
    });
  }

  if (archive.account?.phoneNumber) {
    explicit.push({
      label: "Phone number",
      value: archive.account.phoneNumber,
      source: "explicit",
      severity: "medium",
      category: "identity",
    });
  }

  if (archive.account?.displayName) {
    explicit.push({
      label: "Display name",
      value: archive.account.displayName,
      source: "explicit",
      severity: "low",
      category: "identity",
    });
  }

  if (archive.account?.username) {
    explicit.push({
      label: "Username",
      value: `@${archive.account.username}`,
      source: "explicit",
      severity: "low",
      category: "identity",
    });
  }

  if (archive.profile?.bio) {
    explicit.push({
      label: "Bio",
      value: archive.profile.bio,
      source: "explicit",
      severity: "low",
      category: "identity",
    });
  }

  if (archive.profile?.location) {
    explicit.push({
      label: "Profile location",
      value: archive.profile.location,
      source: "explicit",
      severity: "low",
      category: "location",
    });
  }

  if (archive.profile?.website) {
    explicit.push({
      label: "Website",
      value: archive.profile.website,
      source: "explicit",
      severity: "low",
      category: "identity",
    });
  }

  if (archive.account?.birthDate) {
    explicit.push({
      label: "Birth date",
      value: archive.account.birthDate,
      source: "explicit",
      severity: "medium",
      category: "demographics",
    });
  }

  if (archive.account?.timezone) {
    explicit.push({
      label: "Timezone",
      value: archive.account.timezone,
      source: "explicit",
      severity: "low",
      category: "location",
    });
  }

  if (archive.tweets.length > 0) {
    explicit.push({
      label: "Tweets",
      value: `${archive.tweets.length.toLocaleString("en-US")} tweets shared`,
      source: "explicit",
      severity: "low",
      category: "behavior",
    });
  }

  if (archive.likes.length > 0) {
    explicit.push({
      label: "Likes",
      value: `${archive.likes.length.toLocaleString("en-US")} tweets liked`,
      source: "explicit",
      severity: "low",
      category: "behavior",
    });
  }

  if (archive.contacts.length > 0) {
    explicit.push({
      label: "Uploaded contacts",
      value: `${archive.contacts.length.toLocaleString("en-US")} contacts from your phone`,
      source: "explicit",
      severity: "high",
      category: "identity",
    });
  }

  // --- Inferred data (X-generated) ------------------------------------------

  const p = archive.personalization;

  if (p?.gender) {
    inferred.push({
      label: "Gender",
      value: p.gender,
      source: "inferred",
      severity: "high",
      category: "demographics",
    });
  }

  if (p?.inferredAge) {
    inferred.push({
      label: "Age range",
      value: p.inferredAge,
      source: "inferred",
      severity: "high",
      category: "demographics",
    });
  }

  if (p?.interests && p.interests.length > 0) {
    const active = p.interests.filter((i) => !i.isDisabled);
    inferred.push({
      label: "Interests assigned",
      value: `${p.interests.length} total (${active.length} active)`,
      source: "inferred",
      severity: "high",
      category: "behavior",
    });
  }

  if (p?.shows && p.shows.length > 0) {
    inferred.push({
      label: "TV shows / media tracked",
      value: `${p.shows.length} shows`,
      source: "inferred",
      severity: "medium",
      category: "behavior",
    });
  }

  if (p?.languages && p.languages.length > 0) {
    inferred.push({
      label: "Languages",
      value: p.languages.map((l) => l.language).join(", "),
      source: "inferred",
      severity: "low",
      category: "demographics",
    });
  }

  if (p?.partnerInterests && p.partnerInterests.length > 0) {
    inferred.push({
      label: "Partner interests",
      value: `${p.partnerInterests.length} interests from data brokers`,
      source: "inferred",
      severity: "high",
      category: "monetization",
    });
  }

  if (p?.numAudiences && p.numAudiences > 0) {
    inferred.push({
      label: "Audience lists",
      value: `You appear on ${p.numAudiences} advertiser lists`,
      source: "inferred",
      severity: "high",
      category: "monetization",
    });
  }

  if (p?.lookalikeAdvertisers && p.lookalikeAdvertisers.length > 0) {
    inferred.push({
      label: "Lookalike audiences",
      value: `${p.lookalikeAdvertisers.length} advertisers target your "type"`,
      source: "inferred",
      severity: "medium",
      category: "monetization",
    });
  }

  if (p?.doNotReachAdvertisers && p.doNotReachAdvertisers.length > 0) {
    inferred.push({
      label: "Negative targeting",
      value: `${p.doNotReachAdvertisers.length} brands pay NOT to reach you`,
      source: "inferred",
      severity: "medium",
      category: "monetization",
    });
  }

  if (p?.locationHistory && p.locationHistory.length > 0) {
    const cities = new Set(
      p.locationHistory.map((l) => l.city).filter(Boolean),
    );
    inferred.push({
      label: "Inferred locations",
      value:
        cities.size > 0
          ? `${p.locationHistory.length} entries across ${cities.size} cities`
          : `${p.locationHistory.length} location entries`,
      source: "inferred",
      severity: "high",
      category: "location",
    });
  }

  // IP-based tracking
  const uniqueIps = new Set(archive.ipAudit.map((e) => e.loginIp)).size;
  if (uniqueIps > 0) {
    inferred.push({
      label: "IP addresses logged",
      value: `${uniqueIps} unique IPs from ${archive.ipAudit.length.toLocaleString("en-US")} login events`,
      source: "inferred",
      severity: "high",
      category: "tracking",
    });
  }

  // Device fingerprinting — push devices + encryption keys only. App
  // tokens (deviceTokens) are OAuth grants, not hardware fingerprints.
  const realDeviceCount =
    archive.niDevices.length + archive.keyRegistryDevices.length;
  if (realDeviceCount > 0) {
    inferred.push({
      label: "Devices fingerprinted",
      value: `${realDeviceCount} devices tracked`,
      source: "inferred",
      severity: "high",
      category: "tracking",
    });
  }

  // Inferred apps
  const inferredApps = archive.offTwitter.inferredApps;
  if (inferredApps.length > 0) {
    inferred.push({
      label: "Apps X thinks you installed",
      value: `${inferredApps.length} apps inferred from your device`,
      source: "inferred",
      severity: "high",
      category: "tracking",
    });
  }

  // Off-twitter conversions
  const offConversions =
    archive.offTwitter.mobileConversionsAttributed.length +
    archive.offTwitter.mobileConversionsUnattributed.length +
    archive.offTwitter.onlineConversionsAttributed.length +
    archive.offTwitter.onlineConversionsUnattributed.length;
  if (offConversions > 0) {
    inferred.push({
      label: "Off-Twitter tracking events",
      value: `${offConversions} actions tracked outside X`,
      source: "inferred",
      severity: "high",
      category: "tracking",
    });
  }

  // Grok data sharing
  const grokMessages = archive.grokConversations.reduce(
    (acc, c) => acc + c.messages.filter((m) => m.sender === "user").length,
    0,
  );
  if (grokMessages > 0) {
    inferred.push({
      label: "Messages shared with Grok",
      value: `${grokMessages} prompts sent to X's AI`,
      source: "inferred",
      severity: "medium",
      category: "behavior",
    });
  }

  // Connected apps with write access
  const writeApps = archive.connectedApps.filter((a) =>
    a.permissions.some(
      (p) =>
        p.toLowerCase().includes("write") || p.toLowerCase().includes("post"),
    ),
  );
  if (writeApps.length > 0) {
    inferred.push({
      label: "Apps with write access",
      value: `${writeApps.length} apps can post as you`,
      source: "inferred",
      severity: "high",
      category: "tracking",
    });
  }

  // Advertiser-visible demographics from ad targeting
  const advertiserDemographics = extractAdvertiserDemographics(archive);

  for (const demo of advertiserDemographics.slice(0, 10)) {
    inferred.push({
      label: demo.type,
      value: `${demo.value} (${demo.advertiserCount} advertisers)`,
      source: "inferred",
      severity: demo.advertiserCount > 5 ? "high" : "medium",
      category: "demographics",
    });
  }

  // Count unconfirmed interests using the rigorous matcher (the previous
  // implementation used naive substring `.includes(name)` which under-counted
  // multi-word interests as confirmed whenever the full phrase appeared
  // anywhere — but never bothered with token-level matching).
  let unconfirmedInterestCount = 0;
  const totalInterestCount = p?.interests.length ?? 0;

  if (
    p?.interests &&
    p.interests.length > 0 &&
    (archive.tweets.length > 0 || archive.likes.length > 0)
  ) {
    const tweetCorpus = buildCorpus(archive.tweets.map((t) => t.fullText));
    const likeCorpus = buildCorpus(archive.likes.map((l) => l.fullText));

    for (const interest of p.interests) {
      const confirmed =
        isInterestConfirmed(interest.name, tweetCorpus) ||
        isInterestConfirmed(interest.name, likeCorpus);
      if (!confirmed) unconfirmedInterestCount++;
    }
  }

  const inferredCount = inferred.length;
  const explicitCount = explicit.length;

  return {
    explicit,
    inferred,
    explicitCount,
    inferredCount,
    inferredRatio:
      explicitCount > 0
        ? Math.round((inferredCount / explicitCount) * 10) / 10
        : inferredCount,
    advertiserDemographics,
    unconfirmedInterestCount,
    totalInterestCount,
  };
}
