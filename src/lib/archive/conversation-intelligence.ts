// ---------------------------------------------------------------------------
// Conversation intelligence — cross-reference mentions, replies, DMs, social graph
// ---------------------------------------------------------------------------

import type { ParsedArchive } from "@/lib/archive/types";

export type RelationshipType =
  | "mutual"
  | "following-only"
  | "follower-only"
  | "blocked"
  | "none";

export interface Contact {
  accountId: string;
  screenName: string | null;
  displayName: string | null;
  relationship: RelationshipType;
  mentionCount: number;
  replyCount: number;
  dmSent: number;
  dmReceived: number;
  totalInteractions: number;
  publicInteractions: number;
  privateInteractions: number;
  firstInteraction: string | null;
  lastInteraction: string | null;
}

export interface ConversationStats {
  totalContacts: number;
  contactsByRelationship: Record<RelationshipType, number>;
  publicOnlyContacts: number;
  privateOnlyContacts: number;
  bothChannelsContacts: number;
  dmWithStrangers: number;
  replyToNonFollowers: number;
}

// --- Internal accumulator ---------------------------------------------------

interface Accum {
  mentionCount: number;
  replyCount: number;
  dmSent: number;
  dmReceived: number;
  dates: string[];
}

function emptyAccum(): Accum {
  return { mentionCount: 0, replyCount: 0, dmSent: 0, dmReceived: 0, dates: [] };
}

function getAccum(map: Map<string, Accum>, id: string): Accum {
  let a = map.get(id);
  if (!a) {
    a = emptyAccum();
    map.set(id, a);
  }
  return a;
}

// --- Main -------------------------------------------------------------------

export function buildContactMap(archive: ParsedArchive): Contact[] {
  const selfId = archive.account?.accountId ?? archive.meta.accountId;

  // Social graph sets
  const followerIds = new Set(archive.followers.map((f) => f.accountId));
  const followingIds = new Set(archive.following.map((f) => f.accountId));
  const blockedIds = new Set(archive.blocks.map((b) => b.accountId));

  // Name lookup from tweet mentions
  const nameMap = new Map<string, { screenName: string; displayName: string }>();

  const accum = new Map<string, Accum>();

  // Pass 1: Tweet mentions + replies
  for (const tweet of archive.tweets) {
    const replyTargetId = tweet.inReplyToUserId;

    // Mentions (skip self, skip reply-target to avoid double-counting)
    for (const mention of tweet.mentions) {
      if (mention.id === selfId) continue;

      // Store name mapping
      nameMap.set(mention.id, {
        screenName: mention.screenName,
        displayName: mention.name,
      });

      // Skip reply-target from mention count (will be counted as reply)
      if (mention.id === replyTargetId) continue;

      const a = getAccum(accum, mention.id);
      a.mentionCount++;
      a.dates.push(tweet.createdAt);
    }

    // Replies
    if (replyTargetId && replyTargetId !== selfId) {
      // Also store name from inReplyToScreenName if available
      if (tweet.inReplyToScreenName) {
        if (!nameMap.has(replyTargetId)) {
          nameMap.set(replyTargetId, {
            screenName: tweet.inReplyToScreenName,
            displayName: tweet.inReplyToScreenName,
          });
        }
      }

      const a = getAccum(accum, replyTargetId);
      a.replyCount++;
      a.dates.push(tweet.createdAt);
    }
  }

  // Pass 2: DMs
  for (const convo of archive.directMessages) {
    for (const msg of convo.messages) {
      const otherId =
        msg.senderId === selfId ? msg.recipientId : msg.senderId;
      if (!otherId || otherId === selfId) continue;

      const a = getAccum(accum, otherId);
      if (msg.senderId === selfId) {
        a.dmSent++;
      } else {
        a.dmReceived++;
      }
      a.dates.push(msg.createdAt);
    }
  }

  // Resolve contacts
  const contacts: Contact[] = [];
  for (const [accountId, a] of accum) {
    const names = nameMap.get(accountId);
    const publicInteractions = a.mentionCount + a.replyCount;
    const privateInteractions = a.dmSent + a.dmReceived;

    // Determine relationship
    let relationship: RelationshipType = "none";
    if (blockedIds.has(accountId)) {
      relationship = "blocked";
    } else if (followerIds.has(accountId) && followingIds.has(accountId)) {
      relationship = "mutual";
    } else if (followingIds.has(accountId)) {
      relationship = "following-only";
    } else if (followerIds.has(accountId)) {
      relationship = "follower-only";
    }

    // Date range
    const sorted = a.dates.sort();
    const firstInteraction = sorted[0] ?? null;
    const lastInteraction = sorted[sorted.length - 1] ?? null;

    contacts.push({
      accountId,
      screenName: names?.screenName ?? null,
      displayName: names?.displayName ?? null,
      relationship,
      mentionCount: a.mentionCount,
      replyCount: a.replyCount,
      dmSent: a.dmSent,
      dmReceived: a.dmReceived,
      totalInteractions: publicInteractions + privateInteractions,
      publicInteractions,
      privateInteractions,
      firstInteraction,
      lastInteraction,
    });
  }

  return contacts.sort(
    (a, b) =>
      b.totalInteractions - a.totalInteractions ||
      a.accountId.localeCompare(b.accountId),
  );
}

export function computeConversationStats(
  contacts: Contact[],
): ConversationStats {
  const byRelationship: Record<RelationshipType, number> = {
    mutual: 0,
    "following-only": 0,
    "follower-only": 0,
    blocked: 0,
    none: 0,
  };

  let publicOnly = 0;
  let privateOnly = 0;
  let both = 0;
  let dmStrangers = 0;
  let replyNonFollowers = 0;

  for (const c of contacts) {
    byRelationship[c.relationship]++;

    const hasPublic = c.publicInteractions > 0;
    const hasPrivate = c.privateInteractions > 0;
    if (hasPublic && hasPrivate) both++;
    else if (hasPublic) publicOnly++;
    else if (hasPrivate) privateOnly++;

    if (c.privateInteractions > 0 && c.relationship === "none") {
      dmStrangers++;
    }
    if (
      c.replyCount > 0 &&
      c.relationship !== "mutual" &&
      c.relationship !== "follower-only"
    ) {
      replyNonFollowers++;
    }
  }

  return {
    totalContacts: contacts.length,
    contactsByRelationship: byRelationship,
    publicOnlyContacts: publicOnly,
    privateOnlyContacts: privateOnly,
    bothChannelsContacts: both,
    dmWithStrangers: dmStrangers,
    replyToNonFollowers: replyNonFollowers,
  };
}
