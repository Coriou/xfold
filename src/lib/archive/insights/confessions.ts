import type { ParsedArchive } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";
import { buildZombieInterests } from "./zombie-interests";

// ---------------------------------------------------------------------------
// Confession — picks the single most shocking, evidence-backed fact from
// the archive and packages it as a tight, shareable confession card.
//
// The format is:
//   CLAIM  → one-line accusation
//   PROOF  → specific quote / number from the archive
//   FOOTER → what it means
//
// Designed to be screenshotted and posted on X with minimal context needed.
// ---------------------------------------------------------------------------

export interface Confession {
  /** Short category label: "ZOMBIE INTEREST", "DELETED TWEET", etc. */
  readonly tag: string;
  /** The emoji icon */
  readonly icon: string;
  /** One-line claim */
  readonly claim: string;
  /** Specific proof text from the archive */
  readonly proof: string;
  /** Date of the proof, if available */
  readonly proofDate: string | null;
  /** What it means — the "so what?" */
  readonly punchline: string;
  /** 0-100 shareability for ranking */
  readonly shareability: number;
}

// --- Helpers ----------------------------------------------------------------

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// --- Confession builders ----------------------------------------------------

function confessDeletedTweet(archive: ParsedArchive): Confession | null {
  const deleted = archive.deletedTweets;
  if (deleted.length < 3) return null;

  // Pick the longest deleted tweet (usually the most interesting)
  const best = [...deleted].sort(
    (a, b) => b.fullText.length - a.fullText.length,
  )[0];
  if (!best || best.fullText.length < 10) return null;

  const date = parseDate(best.createdAt);

  return {
    tag: "DELETED TWEET",
    icon: "🗑️",
    claim: `You deleted ${deleted.length.toLocaleString()} tweets. X kept all of them.`,
    proof: truncate(best.fullText, 180),
    proofDate: date ? formatDate(date) : null,
    punchline:
      "Delete doesn't mean gone. It means hidden from you, visible to X.",
    shareability: Math.min(95, 60 + Math.sqrt(deleted.length) * 3),
  };
}

function confessZombieInterest(archive: ParsedArchive): Confession | null {
  const zombies = buildZombieInterests(archive);
  if (!zombies || zombies.zombieCount === 0) return null;

  // Pick the zombie with the most impressions
  const topZombie = [...zombies.entries].sort(
    (a, b) => b.adImpressions - a.adImpressions,
  )[0];
  if (!topZombie) return null;

  return {
    tag: "ZOMBIE INTEREST",
    icon: "🧟",
    claim: `You turned off "${topZombie.name}."`,
    proof: `X showed you ${topZombie.adImpressions.toLocaleString()} ads for it anyway.`,
    proofDate: null,
    punchline: `${zombies.zombieCount} of your disabled interests are still monetized. Your preferences don't matter.`,
    shareability: Math.min(95, 70 + zombies.zombieCount * 5),
  };
}

function confessGrokMessage(archive: ParsedArchive): Confession | null {
  const convos = archive.grokConversations;
  if (convos.length === 0) return null;

  const userMessages = convos.flatMap((c) =>
    c.messages.filter((m) => m.sender === "user"),
  );
  if (userMessages.length < 3) return null;

  // Pick the longest/most interesting message
  const best = [...userMessages].sort(
    (a, b) => b.message.length - a.message.length,
  )[0];
  if (!best || best.message.length < 15) return null;

  const date = parseDate(best.createdAt);

  return {
    tag: "GROK CONFESSION",
    icon: "🤖",
    claim: `You sent Grok ${userMessages.length.toLocaleString()} messages. All stored forever.`,
    proof: truncate(best.message, 180),
    proofDate: date ? formatDate(date) : null,
    punchline:
      "Unlike ChatGPT, Grok ties your questions to your real X identity.",
    shareability: Math.min(90, 55 + Math.sqrt(userMessages.length) * 6),
  };
}

function confessAdvertiserCount(archive: ParsedArchive): Confession | null {
  const impressions = archive.adImpressions.flatMap((b) => b.impressions);
  if (impressions.length < 50) return null;

  const advertisers = new Set(impressions.map((i) => i.advertiserName));
  const topAdvertiser = [
    ...impressions
      .reduce((map, imp) => {
        map.set(imp.advertiserName, (map.get(imp.advertiserName) ?? 0) + 1);
        return map;
      }, new Map<string, number>())
      .entries(),
  ].sort((a, b) => b[1] - a[1])[0];

  if (!topAdvertiser) return null;

  return {
    tag: "AD EXPOSURE",
    icon: "💰",
    claim: `${advertisers.size.toLocaleString()} companies paid X to reach you.`,
    proof: `#1: ${topAdvertiser[0]} — ${topAdvertiser[1].toLocaleString()} impressions.`,
    proofDate: null,
    punchline: "Your data is the product. You earned $0.",
    shareability: Math.min(85, 50 + Math.sqrt(advertisers.size) * 4),
  };
}

function confessContactUpload(archive: ParsedArchive): Confession | null {
  const contacts = archive.contacts;
  if (contacts.length < 20) return null;

  const totalEntries = contacts.reduce(
    (s, c) => s + c.emails.length + c.phoneNumbers.length,
    0,
  );

  return {
    tag: "CONTACT DUMP",
    icon: "📇",
    claim: `You gave X your address book. ${contacts.length.toLocaleString()} contacts shared.`,
    proof: `${totalEntries.toLocaleString()} personal emails and phone numbers — from people who never signed up for X.`,
    proofDate: null,
    punchline:
      "X uses these to build shadow profiles and 'People You May Know' for everyone.",
    shareability: Math.min(85, 50 + Math.sqrt(contacts.length) * 4),
  };
}

function confessOffPlatform(archive: ParsedArchive): Confession | null {
  const ot = archive.offTwitter;
  const total =
    ot.mobileConversionsAttributed.length +
    ot.mobileConversionsUnattributed.length +
    ot.onlineConversionsAttributed.length +
    ot.onlineConversionsUnattributed.length;

  if (total < 5) return null;

  // Pick a specific website or app
  const webEvent = [
    ...ot.onlineConversionsAttributed,
    ...ot.onlineConversionsUnattributed,
  ][0];
  const mobileEvent = [
    ...ot.mobileConversionsAttributed,
    ...ot.mobileConversionsUnattributed,
  ][0];

  let proof: string;
  let proofDate: string | null = null;

  if (webEvent) {
    const url =
      webEvent.conversionUrl ?? webEvent.advertiserName ?? "an outside website";
    proof = `They tracked you on: ${truncate(url, 80)}`;
    const d = parseDate(webEvent.conversionTime);
    proofDate = d ? formatDate(d) : null;
  } else if (mobileEvent) {
    proof = `They tracked your ${mobileEvent.conversionEventName} of ${mobileEvent.applicationName}.`;
    const d = parseDate(mobileEvent.conversionTime);
    proofDate = d ? formatDate(d) : null;
  } else {
    proof = `${total.toLocaleString()} app installs, website visits, and purchases tracked.`;
  }

  return {
    tag: "OFF-PLATFORM TRACKING",
    icon: "🕵️",
    claim: `X followed you outside the app. ${total.toLocaleString()} events tracked.`,
    proof,
    proofDate,
    punchline:
      "Conversion pixels and SDKs let X see what you do across the web.",
    shareability: Math.min(88, 55 + Math.sqrt(total) * 4),
  };
}

function confessDataFate(archive: ParsedArchive): Confession | null {
  // Count categories that survive deletion
  let retainedCategories = 0;
  let totalCategories = 0;

  if (archive.deletedTweets.length > 0) {
    retainedCategories++;
    totalCategories++;
  }
  if (archive.tweets.length > 0) {
    totalCategories++;
  } // maybe
  const dmCount = archive.directMessages.reduce(
    (n, c) => n + c.messages.length,
    0,
  );
  if (dmCount > 0) {
    retainedCategories++;
    totalCategories++;
  }
  if (archive.adImpressions.some((b) => b.impressions.length > 0)) {
    retainedCategories++;
    totalCategories++;
  }
  const offT = archive.offTwitter;
  const offCount =
    offT.mobileConversionsAttributed.length +
    offT.mobileConversionsUnattributed.length +
    offT.onlineConversionsAttributed.length +
    offT.onlineConversionsUnattributed.length;
  if (offCount > 0) {
    retainedCategories++;
    totalCategories++;
  }
  if (archive.grokConversations.length > 0) {
    retainedCategories++;
    totalCategories++;
  }
  if (archive.contacts.length > 0) {
    retainedCategories++;
    totalCategories++;
  }
  if (archive.ipAudit.length > 0) {
    retainedCategories++;
    totalCategories++;
  }
  if (archive.connectedApps.length > 0) {
    totalCategories++;
  } // deleted
  if (archive.likes.length > 0) {
    totalCategories++;
  } // maybe
  if (archive.followers.length > 0) {
    totalCategories++;
  } // deleted

  if (totalCategories < 4) return null;

  const pct = Math.round((retainedCategories / totalCategories) * 100);
  if (pct < 30) return null;

  return {
    tag: "DATA FATE",
    icon: "⚰️",
    claim: `Hit "Delete My Account"? ${pct}% of your data survives.`,
    proof: `${retainedCategories} of ${totalCategories} data categories are retained, shared with third parties, or beyond your reach.`,
    proofDate: null,
    punchline: '"Delete" doesn\'t mean what you think it means.',
    shareability: Math.min(92, 60 + pct * 0.3),
  };
}

// --- Main -------------------------------------------------------------------

export function buildConfessions(archive: ParsedArchive): Confession[] {
  const builders = [
    confessDeletedTweet,
    confessZombieInterest,
    confessGrokMessage,
    confessAdvertiserCount,
    confessContactUpload,
    confessOffPlatform,
    confessDataFate,
  ];

  const confessions: Confession[] = [];
  for (const builder of builders) {
    const result = builder(archive);
    if (result) confessions.push(result);
  }

  // Sort by shareability
  confessions.sort((a, b) => b.shareability - a.shareability);

  return confessions;
}
