// ---------------------------------------------------------------------------
// Evidence Stack — concrete proof attached to top findings
// ---------------------------------------------------------------------------
//
// Takes top-level findings and enriches each one with specific evidence from
// the user's archive: actual tweet text, specific interest names, exact
// advertiser names, DM timestamps, etc. The goal is to move from "you have
// 127 deleted tweets" to "here's one: 'honestly thinking of quitting this
// job lol' — deleted March 14, 2019."
//
// This is the differentiator: not just stats, but receipts.
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";

// --- Types ------------------------------------------------------------------

export interface EvidenceItem {
  /** The specific text or data from the archive */
  readonly text: string;
  /** Source of this evidence */
  readonly source:
    | "deleted-tweet"
    | "tweet"
    | "dm"
    | "interest"
    | "ad"
    | "grok"
    | "contact"
    | "app"
    | "device"
    | "off-twitter";
  /** When the evidence was created, if available */
  readonly date: string | null;
  /** Additional context line */
  readonly context: string | null;
}

export interface EvidenceFinding {
  /** Finding ID from top-findings (for cross-reference) */
  readonly findingId: string;
  /** Human-readable label */
  readonly label: string;
  /** Main claim — the "accusation" */
  readonly claim: string;
  /** The specific evidence backing the claim */
  readonly evidence: readonly EvidenceItem[];
  /** Severity */
  readonly severity: "critical" | "high" | "medium";
}

export interface EvidenceStack {
  readonly findings: readonly EvidenceFinding[];
  readonly totalEvidenceCount: number;
}

// --- Helpers ----------------------------------------------------------------

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

// --- Evidence builders ------------------------------------------------------

function buildDeletionEvidence(archive: ParsedArchive): EvidenceFinding | null {
  const deleted = archive.deletedTweets;
  if (deleted.length < 3) return null;

  // Pick the most interesting deleted tweets (longest, with hashtags, or with mentions)
  const sorted = [...deleted].sort((a, b) => {
    // Prefer ones with hashtags/mentions (more "juicy")
    const aScore =
      a.fullText.length + a.hashtags.length * 20 + a.mentions.length * 15;
    const bScore =
      b.fullText.length + b.hashtags.length * 20 + b.mentions.length * 15;
    return bScore - aScore;
  });

  const evidence: EvidenceItem[] = sorted.slice(0, 3).map((t) => {
    const date = parseDate(t.createdAt);
    const deletedDate = t.deletedAt ? parseDate(t.deletedAt) : null;
    const dateStr = date ? formatDate(date) : null;
    const context = deletedDate
      ? `Deleted on ${formatDate(deletedDate)}`
      : date
        ? `Posted on ${dateStr}`
        : null;

    return {
      text: truncate(t.fullText, 140),
      source: "deleted-tweet" as const,
      date: dateStr,
      context,
    };
  });

  // Cross-reference: any deleted tweet topics still in ad targeting?
  const deletedTopics = new Set<string>();
  for (const t of deleted) {
    for (const h of t.hashtags) deletedTopics.add(h.toLowerCase());
  }
  const interestNames = (archive.personalization?.interests ?? []).map((i) =>
    i.name.toLowerCase(),
  );
  const stillTargeted = [...deletedTopics].filter((topic) =>
    interestNames.some((name) => name.includes(topic) || topic.includes(name)),
  );

  const claim =
    stillTargeted.length > 0
      ? `You deleted ${deleted.length.toLocaleString()} tweets. X kept them all — and still targets you for ${stillTargeted.length} of those topics.`
      : `You deleted ${deleted.length.toLocaleString()} tweets. X kept every single one. Here's proof:`;

  return {
    findingId: "deletion-lie",
    label: "Deleted ≠ Gone",
    claim,
    evidence,
    severity: deleted.length > 100 ? "critical" : "high",
  };
}

function buildZombieEvidence(archive: ParsedArchive): EvidenceFinding | null {
  const interests = archive.personalization?.interests;
  if (!interests) return null;

  const disabled = interests.filter((i) => i.isDisabled);
  if (disabled.length === 0) return null;

  // Find specific disabled interests used in ad targeting
  const disabledMap = new Map(
    disabled.map((i) => [i.name.toLowerCase(), i.name]),
  );
  const zombieAds = new Map<
    string,
    { count: number; firstAdvertiser: string }
  >();

  for (const batch of archive.adImpressions) {
    for (const imp of batch.impressions) {
      for (const tc of imp.targetingCriteria) {
        if (
          tc.targetingValue &&
          tc.targetingType.toLowerCase().includes("interest")
        ) {
          const val = tc.targetingValue.toLowerCase();
          for (const [disName, originalName] of disabledMap) {
            if (val.includes(disName) || disName.includes(val)) {
              const existing = zombieAds.get(originalName);
              if (existing) {
                existing.count++;
              } else {
                zombieAds.set(originalName, {
                  count: 1,
                  firstAdvertiser: imp.advertiserName,
                });
              }
            }
          }
        }
      }
    }
  }

  if (zombieAds.size === 0) return null;

  // Sort by ad count, take top zombies
  const sorted = [...zombieAds.entries()].sort(
    (a, b) => b[1].count - a[1].count,
  );

  const evidence: EvidenceItem[] = sorted.slice(0, 4).map(([name, info]) => ({
    text: `"${name}" — ${info.count.toLocaleString()} ads served`,
    source: "interest" as const,
    date: null,
    context: `First targeted by: ${truncate(info.firstAdvertiser, 40)}`,
  }));

  const totalAds = sorted.reduce((s, [, info]) => s + info.count, 0);

  return {
    findingId: "zombie-interests",
    label: "Disabled ≠ Off",
    claim: `You disabled ${disabled.length} interests. X served ${totalAds.toLocaleString()} ads for ${zombieAds.size} of them after you turned them off.`,
    evidence,
    severity: zombieAds.size > 3 ? "critical" : "high",
  };
}

function buildGrokEvidence(archive: ParsedArchive): EvidenceFinding | null {
  const convos = archive.grokConversations;
  if (convos.length === 0) return null;

  const userMessages = convos.flatMap((c) =>
    c.messages.filter((m) => m.sender === "user"),
  );
  if (userMessages.length < 3) return null;

  // Pick the most interesting/longest user messages
  const sorted = [...userMessages].sort(
    (a, b) => b.message.length - a.message.length,
  );

  const evidence: EvidenceItem[] = sorted.slice(0, 3).map((m) => {
    const date = parseDate(m.createdAt);
    return {
      text: truncate(m.message, 120),
      source: "grok" as const,
      date: date ? formatDate(date) : null,
      context: "You asked Grok",
    };
  });

  return {
    findingId: "grok-confessions",
    label: "AI Conversations Stored",
    claim: `${userMessages.length.toLocaleString()} messages to Grok — tied to your real identity, stored indefinitely, and potentially used for training.`,
    evidence,
    severity: userMessages.length > 50 ? "critical" : "high",
  };
}

function buildAdTargetingEvidence(
  archive: ParsedArchive,
): EvidenceFinding | null {
  const allImpressions = archive.adImpressions.flatMap((b) => b.impressions);
  if (allImpressions.length < 50) return null;

  // Find the most aggressive advertisers
  const advertiserCounts = new Map<string, number>();
  for (const imp of allImpressions) {
    advertiserCounts.set(
      imp.advertiserName,
      (advertiserCounts.get(imp.advertiserName) ?? 0) + 1,
    );
  }

  const sorted = [...advertiserCounts.entries()].sort((a, b) => b[1] - a[1]);

  const evidence: EvidenceItem[] = sorted.slice(0, 4).map(([name, count]) => ({
    text: `${name} — ${count.toLocaleString()} impressions`,
    source: "ad" as const,
    date: null,
    context: null,
  }));

  // Find most invasive targeting types
  const targetingTypes = new Map<string, number>();
  for (const imp of allImpressions) {
    for (const tc of imp.targetingCriteria) {
      targetingTypes.set(
        tc.targetingType,
        (targetingTypes.get(tc.targetingType) ?? 0) + 1,
      );
    }
  }

  const topTargetingTypes = [...targetingTypes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);

  const claim = `${advertiserCounts.size.toLocaleString()} companies paid to reach you, using targeting like: ${topTargetingTypes.join(", ")}. You earned $0.`;

  return {
    findingId: "ad-revenue",
    label: "You Are the Product",
    claim,
    evidence,
    severity: advertiserCounts.size > 100 ? "critical" : "high",
  };
}

function buildOffPlatformEvidence(
  archive: ParsedArchive,
): EvidenceFinding | null {
  const ot = archive.offTwitter;
  const allConversions = [
    ...ot.mobileConversionsAttributed,
    ...ot.mobileConversionsUnattributed,
    ...ot.onlineConversionsAttributed,
    ...ot.onlineConversionsUnattributed,
  ];

  if (allConversions.length < 3 && ot.inferredApps.length < 3) return null;

  const evidence: EvidenceItem[] = [];

  // Show specific app installs tracked
  const mobileEvents = [
    ...ot.mobileConversionsAttributed,
    ...ot.mobileConversionsUnattributed,
  ];
  for (const ev of mobileEvents.slice(0, 2)) {
    const date = parseDate(ev.conversionTime);
    evidence.push({
      text: `${ev.applicationName} — ${ev.conversionEventName}`,
      source: "off-twitter",
      date: date ? formatDate(date) : null,
      context: ev.attributed
        ? "Attributed to an X ad"
        : "Tracked without ad click",
    });
  }

  // Show specific website visits
  const onlineEvents = [
    ...ot.onlineConversionsAttributed,
    ...ot.onlineConversionsUnattributed,
  ];
  for (const ev of onlineEvents.slice(0, 2)) {
    const date = parseDate(ev.conversionTime);
    const url = ev.conversionUrl ?? ev.advertiserName ?? "Unknown website";
    evidence.push({
      text: truncate(url, 60),
      source: "off-twitter",
      date: date ? formatDate(date) : null,
      context: ev.eventType,
    });
  }

  // Show inferred apps
  if (evidence.length < 3 && ot.inferredApps.length > 0) {
    const appNames = ot.inferredApps
      .slice(0, 3)
      .flatMap((a) => a.appNames.slice(0, 1));
    evidence.push({
      text: `X thinks you have: ${appNames.join(", ")}`,
      source: "off-twitter",
      date: null,
      context: `${ot.inferredApps.length} apps inferred total`,
    });
  }

  return {
    findingId: "off-platform",
    label: "Tracked Beyond X",
    claim: `X tracked ${allConversions.length.toLocaleString()} events outside their platform — app installs, website visits, purchases.`,
    evidence: evidence.slice(0, 4),
    severity: allConversions.length > 50 ? "critical" : "high",
  };
}

function buildContactEvidence(archive: ParsedArchive): EvidenceFinding | null {
  const contacts = archive.contacts;
  if (contacts.length < 10) return null;

  const totalEmails = contacts.reduce((s, c) => s + c.emails.length, 0);
  const totalPhones = contacts.reduce((s, c) => s + c.phoneNumbers.length, 0);

  // Show a few contacts (names only, no PII details)
  const namedContacts = contacts.filter((c) => c.firstName ?? c.lastName);
  const evidence: EvidenceItem[] = namedContacts.slice(0, 3).map((c) => {
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
    const dataPoints = c.emails.length + c.phoneNumbers.length;
    const date = c.importedAt ? parseDate(c.importedAt) : null;
    return {
      text: `${name} — ${dataPoints} contact detail${dataPoints === 1 ? "" : "s"} shared`,
      source: "contact" as const,
      date: date ? formatDate(date) : null,
      context: "Uploaded from your address book",
    };
  });

  return {
    findingId: "contact-spillage",
    label: "Other People's Data",
    claim: `You shared ${contacts.length.toLocaleString()} contacts with X — ${(totalEmails + totalPhones).toLocaleString()} emails and phone numbers from people who never agreed to this.`,
    evidence,
    severity: contacts.length > 200 ? "critical" : "high",
  };
}

// --- Main -------------------------------------------------------------------

export function buildEvidenceStack(archive: ParsedArchive): EvidenceStack {
  const builders = [
    buildDeletionEvidence,
    buildZombieEvidence,
    buildGrokEvidence,
    buildAdTargetingEvidence,
    buildOffPlatformEvidence,
    buildContactEvidence,
  ];

  const findings: EvidenceFinding[] = [];
  for (const builder of builders) {
    const result = builder(archive);
    if (result) findings.push(result);
  }

  // Sort by severity: critical > high > medium
  const order = { critical: 0, high: 1, medium: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  const totalEvidenceCount = findings.reduce(
    (s, f) => s + f.evidence.length,
    0,
  );

  return { findings, totalEvidenceCount };
}
