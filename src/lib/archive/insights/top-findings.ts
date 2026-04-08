// ---------------------------------------------------------------------------
// Top Findings — cross-data insight engine
// ---------------------------------------------------------------------------
//
// Surfaces the N most surprising/concerning findings by cross-referencing
// data across the archive. Unlike individual section insights (which are
// siloed), this module correlates multiple data domains to produce findings
// that X's own viewer never shows.
//
// Each finding has:
//   - A short hook (shareable one-liner)
//   - A longer explanation
//   - A severity / shock score (used for ranking)
//   - A link to the relevant section for drill-down
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";
import {
  buildCorpus,
  isInterestConfirmed,
} from "@/lib/archive/interest-matching";
import {
  getDeviceBreakdown,
  getReferenceDate,
  getYearsOnX,
} from "@/lib/archive/account-summary";

// --- Types ------------------------------------------------------------------

export type FindingSeverity = "critical" | "high" | "medium" | "info";

export interface TopFinding {
  /** Unique key for React rendering. */
  readonly id: string;
  /** Short, punchy hook — the shareable one-liner. */
  readonly hook: string;
  /** Longer explanation (1-2 sentences). */
  readonly detail: string;
  /** Severity for visual treatment. */
  readonly severity: FindingSeverity;
  /** 0-100: how surprising / concerning. Used for sorting. */
  readonly shockScore: number;
  /** Section to navigate to for more. */
  readonly sectionId: string | null;
  /** Category tag for grouping. */
  readonly category: string;
  /** Optional action the user can take. */
  readonly action: ActionItem | null;
}

export interface ActionItem {
  readonly label: string;
  readonly url: string;
}

// --- Helpers ----------------------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor(
    Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24),
  );
}

// --- Finding builders -------------------------------------------------------

function findDeletionLie(archive: ParsedArchive): TopFinding | null {
  const deleted = archive.deletedTweets;
  if (deleted.length < 5) return null;

  const total = archive.tweets.length + deleted.length;
  const rate = pct(deleted.length, total);

  // Cross-reference: do deleted tweet topics appear in ad targeting?
  const deletedKeywords = new Set<string>();
  for (const t of deleted) {
    for (const h of t.hashtags) deletedKeywords.add(h.toLowerCase());
  }

  let targetedDeletedTopics = 0;
  const interestNames = (archive.personalization?.interests ?? []).map((i) =>
    i.name.toLowerCase(),
  );
  for (const kw of deletedKeywords) {
    if (interestNames.some((name) => name.includes(kw) || kw.includes(name))) {
      targetedDeletedTopics++;
    }
  }

  const hook =
    targetedDeletedTopics > 0
      ? `You deleted ${fmt(deleted.length)} tweets — X kept them all and still profiles you for ${targetedDeletedTopics} of those topics.`
      : `You deleted ${fmt(deleted.length)} tweets. X kept every single one.`;

  const detail =
    rate > 20
      ? `That's ${rate}% of everything you ever posted. X retains the full text indefinitely.`
      : `X stores the full text of deleted tweets in your archive — they were never truly deleted.`;

  return {
    id: "deletion-lie",
    hook,
    detail,
    severity: deleted.length > 100 ? "critical" : "high",
    shockScore: Math.min(
      95,
      40 + Math.sqrt(deleted.length) * 5 + targetedDeletedTopics * 8,
    ),
    sectionId: "deleted-tweets",
    category: "Data retention",
    action: {
      label: "Request data deletion",
      url: "https://x.com/settings/your_twitter_data",
    },
  };
}

function findZombieInterests(archive: ParsedArchive): TopFinding | null {
  const interests = archive.personalization?.interests;
  if (!interests) return null;

  const disabled = interests.filter((i) => i.isDisabled);
  if (disabled.length === 0) return null;

  // Check how many disabled interests still appear in ad targeting
  const disabledNames = new Set(disabled.map((i) => i.name.toLowerCase()));
  let zombieAdImpressions = 0;
  const zombieNames = new Set<string>();

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const tc of imp.targetingCriteria) {
        if (
          tc.targetingValue &&
          tc.targetingType.toLowerCase().includes("interest")
        ) {
          const val = tc.targetingValue.toLowerCase();
          for (const name of disabledNames) {
            if (val.includes(name) || name.includes(val)) {
              zombieAdImpressions++;
              zombieNames.add(name);
            }
          }
        }
      }
    }
  }

  if (zombieNames.size === 0 && disabled.length < 5) return null;

  const hook =
    zombieNames.size > 0
      ? `You disabled ${fmt(disabled.length)} interests. X ignored your preference and served ${fmt(zombieAdImpressions)} ads for ${zombieNames.size} of them anyway.`
      : `You disabled ${fmt(disabled.length)} interests — but X may still use them for targeting.`;

  return {
    id: "zombie-interests",
    hook,
    detail:
      zombieNames.size > 0
        ? `Interests like "${Array.from(zombieNames).slice(0, 3).join('", "')}" were disabled but still monetized.`
        : `Disabling an interest doesn't guarantee X stops using it for ad delivery.`,
    severity:
      zombieNames.size > 3
        ? "critical"
        : zombieNames.size > 0
          ? "high"
          : "medium",
    shockScore: Math.min(
      90,
      30 + zombieNames.size * 12 + Math.sqrt(zombieAdImpressions) * 2,
    ),
    sectionId: "interests",
    category: "Advertising",
    action: {
      label: "Review ad preferences",
      url: "https://x.com/settings/ads_preferences",
    },
  };
}

function findContactSpillage(archive: ParsedArchive): TopFinding | null {
  const contacts = archive.contacts;
  if (contacts.length < 10) return null;

  const totalEmails = contacts.reduce((s, c) => s + c.emails.length, 0);
  const totalPhones = contacts.reduce((s, c) => s + c.phoneNumbers.length, 0);

  return {
    id: "contact-spillage",
    hook: `You uploaded ${fmt(contacts.length)} contacts to X — ${fmt(totalEmails + totalPhones)} phone numbers and emails from people who never consented.`,
    detail: `X uses uploaded contacts to power "People You May Know" suggestions and to build shadow profiles for non-users.`,
    severity: contacts.length > 200 ? "critical" : "high",
    shockScore: Math.min(85, 35 + Math.sqrt(contacts.length) * 4),
    sectionId: "contacts",
    category: "Privacy",
    action: {
      label: "Delete imported contacts",
      url: "https://x.com/settings/contacts",
    },
  };
}

function findOffPlatformTracking(archive: ParsedArchive): TopFinding | null {
  const ot = archive.offTwitter;
  const totalConversions =
    ot.mobileConversionsAttributed.length +
    ot.mobileConversionsUnattributed.length +
    ot.onlineConversionsAttributed.length +
    ot.onlineConversionsUnattributed.length;

  const inferredAppCount = ot.inferredApps.length;

  if (totalConversions < 5 && inferredAppCount < 3) return null;

  const appNames = ot.inferredApps.flatMap((a) => a.appNames).slice(0, 5);

  const hook =
    inferredAppCount > 5
      ? `X tracked you across ${fmt(totalConversions)} events outside Twitter and knows about ${fmt(inferredAppCount)} apps on your devices.`
      : `X tracked ${fmt(totalConversions)} activities outside Twitter — app installs, website visits, and conversions.`;

  const detail =
    appNames.length > 0
      ? `X thinks you have: ${appNames.join(", ")}${inferredAppCount > 5 ? `, and ${inferredAppCount - 5} more` : ""}.`
      : `These events come from advertiser conversion pixels and SDKs — tracking you where you least expect it.`;

  return {
    id: "off-platform",
    hook,
    detail,
    severity: totalConversions > 50 ? "critical" : "high",
    shockScore: Math.min(
      88,
      30 + Math.sqrt(totalConversions) * 4 + inferredAppCount * 2,
    ),
    sectionId: "off-twitter",
    category: "Tracking",
    action: null,
  };
}

function findGrokConfessions(archive: ParsedArchive): TopFinding | null {
  const convos = archive.grokConversations;
  if (convos.length === 0) return null;

  const totalMessages = convos.reduce((s, c) => s + c.messages.length, 0);
  const userMessages = convos.reduce(
    (s, c) => s + c.messages.filter((m) => m.sender === "user").length,
    0,
  );

  if (userMessages < 3) return null;

  return {
    id: "grok-confessions",
    hook: `You sent ${fmt(userMessages)} messages to X's AI. All ${fmt(totalMessages)} messages (yours and Grok's replies) are stored indefinitely.`,
    detail: `Unlike ChatGPT, Grok conversations are tied to your X identity — your real name, account, and targeting profile.`,
    severity:
      userMessages > 50 ? "critical" : userMessages > 10 ? "high" : "medium",
    shockScore: Math.min(85, 40 + Math.sqrt(userMessages) * 8),
    sectionId: "grok",
    category: "AI",
    action: {
      label: "Manage Grok data",
      url: "https://x.com/settings/grok",
    },
  };
}

function findAdRevenueEstimate(archive: ParsedArchive): TopFinding | null {
  const totalImpressions = archive.adImpressions.reduce(
    (sum, batch) => sum + batch.impressions.length,
    0,
  );
  if (totalImpressions < 50) return null;

  const advertiserSet = new Set<string>();
  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      advertiserSet.add(imp.advertiserName);
    }
  }
  for (const batch of archive.adEngagements) {
    for (const eng of batch.engagements) {
      advertiserSet.add(eng.advertiserName);
    }
  }

  // Quick CPM estimate (conservative average $3.50 per 1000 impressions)
  const estimatedRevenue = (totalImpressions / 1000) * 3.5;

  return {
    id: "ad-revenue",
    hook: `${fmt(advertiserSet.size)} companies paid to target you. X earned an estimated $${estimatedRevenue.toFixed(2)} from ${fmt(totalImpressions)} ad impressions.`,
    detail: `Your data is the product. You earned $0.00.`,
    severity:
      advertiserSet.size > 100
        ? "critical"
        : advertiserSet.size > 30
          ? "high"
          : "medium",
    shockScore: Math.min(
      80,
      25 + Math.sqrt(advertiserSet.size) * 5 + Math.sqrt(estimatedRevenue) * 2,
    ),
    sectionId: "ad-price-tag",
    category: "Monetization",
    action: null,
  };
}

function findInferenceAccuracy(archive: ParsedArchive): TopFinding | null {
  const p = archive.personalization;
  if (!p) return null;
  if (p.interests.length < 10) return null;

  // Use the same rigorous matching as accuracy-audit so the headline here
  // and the dedicated section never disagree. The previous implementation
  // used "any 4-char token is a substring", which over-confirmed badly.
  const tweetCorpus = buildCorpus(archive.tweets.map((t) => t.fullText));

  let confirmed = 0;
  let unconfirmed = 0;
  for (const interest of p.interests) {
    if (isInterestConfirmed(interest.name, tweetCorpus)) {
      confirmed++;
    } else {
      unconfirmed++;
    }
  }

  const confirmedPercent = pct(confirmed, p.interests.length);
  if (confirmedPercent > 60) return null; // Mostly grounded, not shocking
  const unconfirmedPercent = 100 - confirmedPercent;

  return {
    id: "inference-accuracy",
    hook: `X assigned ${fmt(p.interests.length)} interests to you — only ${confirmedPercent}% appear in anything you've actually tweeted.`,
    detail: `${fmt(unconfirmed)} interests have no behavioral evidence in your public activity, yet advertisers paid to target them.`,
    severity:
      confirmedPercent < 20
        ? "critical"
        : confirmedPercent < 40
          ? "high"
          : "medium",
    shockScore: Math.min(82, 30 + unconfirmedPercent / 2),
    sectionId: "ad-profile",
    category: "Profiling",
    action: {
      label: "Review your interests",
      url: "https://x.com/settings/your_twitter_data/twitter_interests",
    },
  };
}

function findDeviceSurveillance(archive: ParsedArchive): TopFinding | null {
  const uniqueIps = new Set(archive.ipAudit.map((e) => e.loginIp)).size;
  const devices = getDeviceBreakdown(archive);

  if (uniqueIps < 5 && devices.total < 3) return null;

  // Headline differentiates app tokens from real device endpoints. The
  // previous wording ("fingerprinted N devices") lumped OAuth grants for
  // "Twitter for iPhone" / "Twitter for iPad" into a "devices" count, which
  // overstated by ~5–10x and broke trust on cross-reference with the
  // Devices section.
  const realDeviceCount = devices.pushDevices + devices.encryptionKeys;
  const hook =
    realDeviceCount > 0
      ? `X logged ${fmt(uniqueIps)} unique IP addresses and fingerprinted ${fmt(realDeviceCount)} of your devices via push and encryption identifiers.`
      : `X logged ${fmt(uniqueIps)} unique IP addresses across your account.`;

  const tokenSuffix =
    devices.appTokens > 0
      ? ` Plus ${fmt(devices.appTokens)} app authorization token${devices.appTokens === 1 ? "" : "s"}.`
      : "";

  return {
    id: "device-surveillance",
    hook,
    detail: `Combined with ${fmt(archive.ipAudit.length)} login events, this creates a detailed map of where and how you access X.${tokenSuffix}`,
    severity: uniqueIps > 50 ? "critical" : uniqueIps > 15 ? "high" : "medium",
    shockScore: Math.min(
      78,
      20 + Math.sqrt(uniqueIps) * 5 + realDeviceCount * 3,
    ),
    sectionId: "ip-analysis",
    category: "Tracking",
    action: null,
  };
}

function findDataBrokerPipeline(archive: ParsedArchive): TopFinding | null {
  const p = archive.personalization;
  if (!p) return null;

  const partnerCount = p.partnerInterests.length;
  const lookalikesCount = p.lookalikeAdvertisers.length;
  const doNotReachCount = p.doNotReachAdvertisers.length;

  if (partnerCount < 3 && lookalikesCount < 3) return null;

  const hook =
    partnerCount > 0
      ? `${fmt(partnerCount)} interests about you came from third-party data brokers — not from anything you did on X.`
      : `${fmt(lookalikesCount)} companies use your profile as a template to find people like you.`;

  const detail =
    partnerCount > 0 && lookalikesCount > 0
      ? `Data brokers feed X information about you from outside the platform, and ${fmt(lookalikesCount)} advertisers clone your profile for lookalike targeting.`
      : partnerCount > 0
        ? `These interests were purchased by X from external data companies. You had no say in this.`
        : `Lookalike targeting means advertisers can reach millions of people who resemble your digital profile.`;

  return {
    id: "data-brokers",
    hook,
    detail: `${detail}${doNotReachCount > 0 ? ` Meanwhile, ${fmt(doNotReachCount)} companies paid NOT to show you ads — you're on their exclude list.` : ""}`,
    severity: partnerCount > 10 ? "critical" : "high",
    shockScore: Math.min(80, 30 + partnerCount * 4 + lookalikesCount * 2),
    sectionId: "demographics",
    category: "Data brokers",
    action: null,
  };
}

function findConnectedAppRisk(archive: ParsedArchive): TopFinding | null {
  const apps = archive.connectedApps;
  if (apps.length < 2) return null;

  const writeApps = apps.filter((a) =>
    a.permissions.some(
      (p) =>
        p.toLowerCase().includes("write") ||
        p.toLowerCase().includes("direct message"),
    ),
  );

  if (writeApps.length === 0 && apps.length < 5) return null;

  // Caveat: the archive lists every app the user has *ever* authorized.
  // It does not include revocation timestamps, so we can't tell which
  // are still active vs. long-revoked. Frame the claim accordingly.
  const hook =
    writeApps.length > 0
      ? `You've authorized ${fmt(apps.length)} third-party apps over time — ${fmt(writeApps.length)} were granted permission to post tweets or read DMs.`
      : `You've authorized ${fmt(apps.length)} third-party apps to access your X account.`;

  return {
    id: "connected-apps",
    hook,
    detail:
      writeApps.length > 0
        ? `Apps with write or DM access: ${writeApps
            .slice(0, 3)
            .map((a) => a.name)
            .join(
              ", ",
            )}${writeApps.length > 3 ? `, +${writeApps.length - 3} more` : ""}. The archive doesn't record revocations — review the live list to see which are still active.`
        : `Each connected app could read your profile, tweets, and follower lists. The archive doesn't track which authorizations you've since revoked — check the live settings.`,
    severity:
      writeApps.length > 2
        ? "critical"
        : writeApps.length > 0
          ? "high"
          : "medium",
    shockScore: Math.min(75, 20 + apps.length * 3 + writeApps.length * 12),
    sectionId: "connected-apps",
    category: "Third-party access",
    action: {
      label: "Review connected apps",
      url: "https://x.com/settings/connected_apps",
    },
  };
}

function findBulkDeletionPattern(archive: ParsedArchive): TopFinding | null {
  const deleted = archive.deletedTweets;
  if (deleted.length < 10) return null;

  // Group deletions by date (day)
  const byDay = new Map<string, number>();
  for (const t of deleted) {
    const dateStr = t.deletedAt ?? t.createdAt;
    const d = parseDate(dateStr);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  // Find the peak day
  let peakDay = "";
  let peakCount = 0;
  for (const [day, count] of byDay) {
    if (count > peakCount) {
      peakDay = day;
      peakCount = count;
    }
  }

  // Not interesting unless there's a clear bulk pattern
  if (peakCount < 10) return null;

  const peakDate = parseDate(peakDay);
  const formattedDate = peakDate
    ? peakDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : peakDay;

  return {
    id: "bulk-deletion",
    hook: `You deleted ${fmt(peakCount)} tweets in one day (${formattedDate}). X recorded the entire cleanup.`,
    detail: `Whether it was a midnight regret or a reputation cleanup, X kept every word. The bulk deletion itself is a signal about what you wanted to hide.`,
    severity: peakCount > 50 ? "critical" : "high",
    shockScore: Math.min(80, 35 + Math.sqrt(peakCount) * 6),
    sectionId: "deleted-tweets",
    category: "Data retention",
    action: null,
  };
}

function findPrivacyErosion(archive: ParsedArchive): TopFinding | null {
  // Use the canonical "years on X" helper so this finder, the Privacy
  // Erosion section header, and the X Eras share card all agree. The
  // previous implementation rolled its own with `Date.now()` + `/365` and
  // disagreed with both surfaces.
  const accountAgeYears = getYearsOnX(archive);
  if (accountAgeYears === null) return null;
  if (accountAgeYears < 1) return null;

  const accountCreated = archive.account?.createdAt
    ? parseDate(archive.account.createdAt)
    : null;
  if (!accountCreated) return null;

  const refDate = getReferenceDate(archive);
  const accountAgeDays = Math.max(1, daysBetween(accountCreated, refDate));

  // Count total surveillance data points
  const totalDMs = archive.directMessages.reduce(
    (s, c) => s + c.messages.length,
    0,
  );
  const totalAdImpressions = archive.adImpressions.reduce(
    (s, b) => s + b.impressions.length,
    0,
  );
  const totalDataPoints =
    archive.tweets.length +
    archive.deletedTweets.length +
    archive.likes.length +
    totalDMs +
    archive.ipAudit.length +
    totalAdImpressions +
    archive.contacts.length +
    archive.grokConversations.reduce((s, c) => s + c.messages.length, 0);

  const pointsPerDay = Math.round(totalDataPoints / accountAgeDays);

  if (totalDataPoints < 500) return null;

  return {
    id: "privacy-erosion",
    hook: `Over ${fmt(accountAgeYears)} years, X accumulated ${fmt(totalDataPoints)} data points about you — that's ~${fmt(pointsPerDay)} per day.`,
    detail: `Tweets, DMs, ad views, logins, deleted content, contacts — every interaction is stored, indexed, and monetized.`,
    severity:
      totalDataPoints > 50000
        ? "critical"
        : totalDataPoints > 10000
          ? "high"
          : "medium",
    shockScore: Math.min(85, 30 + Math.log10(totalDataPoints) * 12),
    sectionId: "overview",
    category: "Overall",
    action: {
      label: "Download your data",
      url: "https://x.com/settings/download_your_data",
    },
  };
}

// --- Main -------------------------------------------------------------------

export function computeTopFindings(archive: ParsedArchive): TopFinding[] {
  const finders = [
    findDeletionLie,
    findZombieInterests,
    findContactSpillage,
    findOffPlatformTracking,
    findGrokConfessions,
    findAdRevenueEstimate,
    findInferenceAccuracy,
    findDeviceSurveillance,
    findDataBrokerPipeline,
    findConnectedAppRisk,
    findBulkDeletionPattern,
    findPrivacyErosion,
  ];

  const findings: TopFinding[] = [];
  for (const finder of finders) {
    const result = finder(archive);
    if (result) findings.push(result);
  }

  // Sort by shock score descending
  findings.sort((a, b) => b.shockScore - a.shockScore);

  return findings;
}
