// ---------------------------------------------------------------------------
// Data Fate — "If You Left Today"
// ---------------------------------------------------------------------------
//
// For each category of data X holds, shows what would actually happen to it
// if the user deleted their account right now. Most people assume "delete"
// means gone. It doesn't. This insight turns that assumption on its head by
// showing the concrete retention policy per data type, backed by evidence
// from the user's own archive.
//
// Sources:
//   - X's Privacy Policy (last updated Dec 2024)
//   - X's Terms of Service
//   - GDPR/CCPA deletion requirements vs actual behavior
//   - Archive evidence: retained deletions, off-platform data, partner data
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";

// --- Types ------------------------------------------------------------------

export type FateVerdict = "deleted" | "maybe" | "retained" | "shared";

export interface DataFateEntry {
  /** Human-readable label, e.g. "Your tweets" */
  readonly label: string;
  /** What happens to this data on account deletion */
  readonly verdict: FateVerdict;
  /** Concrete explanation of why */
  readonly explanation: string;
  /** How much data the user has in this category */
  readonly count: number;
  /** Unit for the count: "tweets", "messages", etc. */
  readonly unit: string;
  /** Evidence note from the user's archive, if applicable */
  readonly evidence: string | null;
  /** Icon hint for rendering */
  readonly icon: string;
}

export interface DataFateResult {
  /** All fate entries, ordered by severity (retained first) */
  readonly entries: readonly DataFateEntry[];
  /** Number of categories where data is retained or shared despite deletion */
  readonly retainedCount: number;
  /** Number of categories where data is truly deleted */
  readonly deletedCount: number;
  /** Number of categories with uncertain fate */
  readonly maybeCount: number;
  /** Total data points across all categories */
  readonly totalDataPoints: number;
  /** One-line summary statement */
  readonly summary: string;
}

// --- Verdict ordering (for sorting) -----------------------------------------

const VERDICT_ORDER: Record<FateVerdict, number> = {
  shared: 0,
  retained: 1,
  maybe: 2,
  deleted: 3,
};

// --- Builders ---------------------------------------------------------------

function buildFateEntries(archive: ParsedArchive): DataFateEntry[] {
  const entries: DataFateEntry[] = [];

  // --- Deleted tweets (retained) ---
  const deletedTweetCount = archive.deletedTweets.length;
  if (deletedTweetCount > 0) {
    entries.push({
      label: "Deleted tweets",
      verdict: "retained",
      explanation:
        "X already kept these after you deleted them. Account deletion won't change that — they're retained for legal, safety, and business purposes.",
      count: deletedTweetCount,
      unit: deletedTweetCount === 1 ? "tweet" : "tweets",
      evidence: `Your archive contains ${deletedTweetCount.toLocaleString()} tweets you thought you deleted. They still have the full text.`,
      icon: "🗑️",
    });
  }

  // --- Tweets (delayed deletion) ---
  const tweetCount = archive.tweets.length;
  if (tweetCount > 0) {
    entries.push({
      label: "Your tweets",
      verdict: "maybe",
      explanation:
        "Removed from public view within 30 days. But X retains copies for up to 18 months for legal, regulatory, and safety purposes.",
      count: tweetCount,
      unit: tweetCount === 1 ? "tweet" : "tweets",
      evidence: null,
      icon: "💬",
    });
  }

  // --- DMs (retained by recipients) ---
  const dmCount =
    archive.directMessages.reduce((n, c) => n + c.messages.length, 0) +
    archive.groupDirectMessages.reduce((n, c) => n + c.messages.length, 0);
  if (dmCount > 0) {
    entries.push({
      label: "Direct messages",
      verdict: "retained",
      explanation:
        "Deleting your account only removes your copy. Recipients still have every message in their inbox. X retains the messages on their side too.",
      count: dmCount,
      unit: dmCount === 1 ? "message" : "messages",
      evidence: null,
      icon: "✉️",
    });
  }

  // --- Ad targeting / profiling data (retained) ---
  const impressionCount = archive.adImpressions.reduce(
    (n, b) => n + b.impressions.length,
    0,
  );
  const interestCount = archive.personalization?.interests.length ?? 0;
  if (impressionCount > 0 || interestCount > 0) {
    const totalAdData = impressionCount + interestCount;
    entries.push({
      label: "Ad targeting & profiling data",
      verdict: "retained",
      explanation:
        "Your behavioral profile, interest graph, and ad impression history are retained for X's advertising business. Anonymized or aggregated — but the profile persists.",
      count: totalAdData,
      unit: "data points",
      evidence:
        interestCount > 0
          ? `${interestCount.toLocaleString()} interests assigned to your profile, built over years of activity.`
          : null,
      icon: "🎯",
    });
  }

  // --- Off-platform tracking (shared with third parties) ---
  const offTwitterCount =
    archive.offTwitter.mobileConversionsAttributed.length +
    archive.offTwitter.mobileConversionsUnattributed.length +
    archive.offTwitter.onlineConversionsAttributed.length +
    archive.offTwitter.onlineConversionsUnattributed.length;
  if (offTwitterCount > 0) {
    entries.push({
      label: "Off-platform tracking",
      verdict: "shared",
      explanation:
        "Already shared with advertisers via conversion pixels and SDKs. Deleting your X account can't recall data that's already been sent to third parties.",
      count: offTwitterCount,
      unit: offTwitterCount === 1 ? "event" : "events",
      evidence: `${offTwitterCount.toLocaleString()} off-platform conversions (app installs, website visits) were reported to advertisers.`,
      icon: "🕵️",
    });
  }

  // --- Partner interests / data broker data (shared) ---
  const partnerCount = archive.personalization?.partnerInterests.length ?? 0;
  if (partnerCount > 0) {
    entries.push({
      label: "Data broker labels",
      verdict: "shared",
      explanation:
        "Third-party data brokers supplied these labels. They still have the data on their end — deleting your X account won't reach their databases.",
      count: partnerCount,
      unit: partnerCount === 1 ? "label" : "labels",
      evidence: null,
      icon: "🏷️",
    });
  }

  // --- Grok conversations (retained for training) ---
  const grokCount = archive.grokConversations.reduce(
    (n, c) => n + c.messages.length,
    0,
  );
  if (grokCount > 0) {
    entries.push({
      label: "Grok conversations",
      verdict: "retained",
      explanation:
        "Your conversations may have already been used to train AI models. You can't un-train a model. X's policy allows retention for model improvement.",
      count: grokCount,
      unit: grokCount === 1 ? "message" : "messages",
      evidence: null,
      icon: "🤖",
    });
  }

  // --- Uploaded contacts (retained) ---
  const contactCount = archive.contacts.length;
  if (contactCount > 0) {
    entries.push({
      label: "Uploaded contacts",
      verdict: "retained",
      explanation:
        "Address book data you synced is used for 'People you may know' recommendations — for other users, not just you. Your contacts' data persists in X's social graph even after you leave.",
      count: contactCount,
      unit: contactCount === 1 ? "contact" : "contacts",
      evidence: `You shared ${contactCount.toLocaleString()} contacts' emails and phone numbers with X.`,
      icon: "📇",
    });
  }

  // --- Inferred apps (retained) ---
  const inferredAppCount = archive.offTwitter.inferredApps.length;
  if (inferredAppCount > 0) {
    entries.push({
      label: "Inferred installed apps",
      verdict: "retained",
      explanation:
        "X guessed what apps are on your devices. This inference data feeds ad targeting models that persist beyond your account.",
      count: inferredAppCount,
      unit: inferredAppCount === 1 ? "app" : "apps",
      evidence: null,
      icon: "📱",
    });
  }

  // --- IP / device fingerprints (retained) ---
  const ipCount = archive.ipAudit.length;
  const deviceCount =
    archive.deviceTokens.length +
    archive.niDevices.length +
    archive.keyRegistryDevices.length;
  if (ipCount > 0 || deviceCount > 0) {
    entries.push({
      label: "Login IPs & device fingerprints",
      verdict: "retained",
      explanation:
        "Retained for security and fraud prevention. X keeps login history and device identifiers even after account deletion.",
      count: ipCount + deviceCount,
      unit: "records",
      evidence:
        ipCount > 0
          ? `${ipCount.toLocaleString()} login events from your IP addresses are on file.`
          : null,
      icon: "📍",
    });
  }

  // --- Connected apps (deleted) ---
  const appCount = archive.connectedApps.length;
  if (appCount > 0) {
    entries.push({
      label: "Connected app permissions",
      verdict: "deleted",
      explanation:
        "OAuth tokens are revoked on account deletion — apps lose access. But data they already read from your account is theirs to keep.",
      count: appCount,
      unit: appCount === 1 ? "app" : "apps",
      evidence: null,
      icon: "🔑",
    });
  }

  // --- Likes (delayed deletion) ---
  const likeCount = archive.likes.length;
  if (likeCount > 0) {
    entries.push({
      label: "Likes",
      verdict: "maybe",
      explanation:
        "Removed from public view, but X retains engagement data in aggregate form for content ranking and advertiser reporting.",
      count: likeCount,
      unit: likeCount === 1 ? "like" : "likes",
      evidence: null,
      icon: "❤️",
    });
  }

  // --- Followers/following (deleted) ---
  const followerCount = archive.followers.length;
  const followingCount = archive.following.length;
  if (followerCount > 0 || followingCount > 0) {
    entries.push({
      label: "Social connections",
      verdict: "deleted",
      explanation:
        "Follow relationships are removed. But the social graph data (who follows whom) persists in X's recommendation engine.",
      count: followerCount + followingCount,
      unit: "connections",
      evidence: null,
      icon: "👥",
    });
  }

  // --- Profile (deleted) ---
  if (archive.profile) {
    entries.push({
      label: "Profile info",
      verdict: "deleted",
      explanation:
        "Bio, display name, avatar, and header are removed from public view. Cached copies may persist in search engines and the Wayback Machine.",
      count: 1,
      unit: "profile",
      evidence: null,
      icon: "👤",
    });
  }

  // Sort: shared first, then retained, then maybe, then deleted
  entries.sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict]);

  return entries;
}

// --- Main -------------------------------------------------------------------

export function computeDataFate(archive: ParsedArchive): DataFateResult {
  const entries = buildFateEntries(archive);

  const retainedCount = entries.filter(
    (e) => e.verdict === "retained" || e.verdict === "shared",
  ).length;
  const deletedCount = entries.filter((e) => e.verdict === "deleted").length;
  const maybeCount = entries.filter((e) => e.verdict === "maybe").length;
  const totalDataPoints = entries.reduce((n, e) => n + e.count, 0);

  const pct =
    entries.length > 0 ? Math.round((retainedCount / entries.length) * 100) : 0;

  const summary =
    retainedCount === 0
      ? "If you deleted your account today, most of your data would eventually be removed."
      : `If you deleted your account today, ${pct}% of your data categories would survive — already shared, retained, or beyond your reach.`;

  return {
    entries,
    retainedCount,
    deletedCount,
    maybeCount,
    totalDataPoints,
    summary,
  };
}
