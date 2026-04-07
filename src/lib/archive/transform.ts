// ---------------------------------------------------------------------------
// Transform raw archive JSON into typed ParsedArchive
// ---------------------------------------------------------------------------

import type {
  ParsedArchive,
  ArchiveMeta,
  ArchiveStats,
  AccountInfo,
  ProfileInfo,
  Tweet,
  TweetMedia,
  TweetMention,
  TweetUrl,
  VideoVariant,
  Like,
  DMConversation,
  DMMessage,
  DMReaction,
  SocialEntry,
  AdEngagementBatch,
  AdEngagement,
  AdImpressionBatch,
  AdImpression,
  TargetingCriterion,
  LocationHistoryEntry,
  Personalization,
  PersonalizationInterest,
  PersonalizationLanguage,
  IpAuditEntry,
  DeviceToken,
  ConnectedApp,
  NiDevice,
  KeyRegistryDevice,
  GrokConversation,
  GrokMessage,
  GrokAttachment,
  ScreenNameChange,
  ListInfo,
  BranchLinkEvent,
  InferredApp,
  MobileConversionEvent,
  OnlineConversionEvent,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
//
// `transform.ts` parses untrusted JSON whose shape varies across X archive
// versions and isn't worth modeling as full TypeScript types. We intentionally
// use `any` here so that dot-access works without `noPropertyAccessFromIndexSignature`
// fighting us at every line. Eslint's `no-explicit-any` is disabled for this
// file only. TODO: tighten by introducing per-file raw shape types if/when the
// archive format stabilizes.

/* eslint-disable @typescript-eslint/no-explicit-any */
type R = any;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function arr(v: unknown): any[] {
  return Array.isArray(v) ? v : [];
}

function first(v: unknown): R | null {
  const a = arr(v);
  return a.length > 0 ? a[0] : null;
}

/** Strip HTML tags from tweet source field -> app name */
function parseSource(html: string): string {
  const match = html.match(/>([^<]+)</);
  return match?.[1] ?? html;
}

// ---------------------------------------------------------------------------
// Main transform
// ---------------------------------------------------------------------------

export function transformArchive(
  raw: Record<string, unknown>,
  fileCount: number,
  mediaFileCount: number,
): ParsedArchive {
  const r = (key: string): any[] => arr(raw[key]);

  return {
    meta: transformMeta(raw),
    stats: transformStats(raw, fileCount, mediaFileCount),
    account: transformAccount(raw),
    profile: transformProfile(r("profile")),
    personalization: transformPersonalization(r("personalization")),
    tweets: r("tweets").map(transformTweet),
    likes: r("like").map(transformLike),
    directMessages: r("direct_messages").map(transformDMConversation),
    followers: r("follower").map(transformSocialEntry("follower")),
    following: r("following").map(transformSocialEntry("following")),
    blocks: r("block").map(transformSocialEntry("blocking")),
    adEngagements: r("ad_engagements").map(transformAdEngagementBatch),
    adImpressions: r("ad_impressions").map(transformAdImpressionBatch),
    ipAudit: r("ip_audit").map(transformIpAudit),
    deviceTokens: r("device_token").map(transformDeviceToken),
    connectedApps: r("connected_application").map(transformConnectedApp),
    niDevices: r("ni_devices").map(transformNiDevice),
    keyRegistryDevices: transformKeyRegistry(r("key_registry")),
    grokConversations: groupGrokConversations(r("grok_chat_item")),
    screenNameChanges: r("screen_name_change").map(transformScreenNameChange),
    lists: [
      ...r("lists_created").map(transformList("created")),
      ...r("lists_member").map(transformList("member")),
      ...r("lists_subscribed").map(transformList("subscribed")),
    ],
    offTwitter: {
      mobileConversionsAttributed: r("ad_mobile_conversions_attributed").map(
        transformMobileConversion(true),
      ),
      mobileConversionsUnattributed: r("ad_mobile_conversions_unattributed").map(
        transformMobileConversion(false),
      ),
      onlineConversionsAttributed: r("ad_online_conversions_attributed").map(
        transformOnlineConversion(true),
      ),
      onlineConversionsUnattributed: r("ad_online_conversions_unattributed").map(
        transformOnlineConversion(false),
      ),
      branchLinks: r("branch_links").map(transformBranchLink),
      inferredApps: r("app").map(transformInferredApp),
    },
    raw: raw as Record<string, unknown[]>,
  };
}

// ---------------------------------------------------------------------------
// Section transformers
// ---------------------------------------------------------------------------

function transformMeta(raw: Record<string, unknown>): ArchiveMeta {
  // Cast widens `unknown` → `any` so dot-access to nested fields below
  // works without bracket-access plumbing. See file header for context.
  const manifest = raw["__manifest"] as R;
  const accountArr = arr(raw["account"]);
  const acct = first(accountArr)?.account;

  return {
    generationDate: str(manifest?.archiveInfo?.generationDate),
    sizeBytes: num(manifest?.archiveInfo?.sizeBytes),
    isPartialArchive: !!manifest?.archiveInfo?.isPartialArchive,
    accountId: str(acct?.accountId ?? manifest?.userInfo?.accountId),
    username: str(acct?.username ?? manifest?.userInfo?.userName),
    displayName: str(
      acct?.accountDisplayName ?? manifest?.userInfo?.displayName,
    ),
  };
}

function transformStats(
  raw: Record<string, unknown>,
  fileCount: number,
  mediaFileCount: number,
): ArchiveStats {
  const counts: Record<string, number> = {};
  let parsedFiles = 0;
  let emptyFiles = 0;
  let totalRecords = 0;

  for (const [key, value] of Object.entries(raw)) {
    if (key === "__manifest") continue;
    parsedFiles++;
    const a = arr(value);
    counts[key] = a.length;
    totalRecords += a.length;
    if (a.length === 0) emptyFiles++;
  }

  counts["_total"] = totalRecords;

  return {
    totalFiles: fileCount,
    parsedFiles,
    emptyFiles,
    mediaFileCount,
    counts,
  };
}

function transformAccount(raw: Record<string, unknown>): AccountInfo | null {
  const acct = first(arr(raw["account"]))?.account;
  if (!acct) return null;

  const tz = first(arr(raw["account_timezone"]))?.accountTimezone;
  const phone = first(arr(raw["phone_number"]))?.device;
  const verified = first(arr(raw["verified"]))?.verified;
  const age = first(arr(raw["ageinfo"]))?.ageMeta?.ageInfo;
  const creationIp = first(arr(raw["account_creation_ip"]))
    ?.accountCreationIp;

  return {
    accountId: str(acct.accountId),
    username: str(acct.username),
    displayName: str(acct.accountDisplayName),
    email: str(acct.email),
    createdAt: str(acct.createdAt),
    createdVia: str(acct.createdVia),
    timezone: str(tz?.timeZone),
    phoneNumber: phone?.phoneNumber ? str(phone.phoneNumber) : null,
    verified: !!verified?.verified,
    ageRange: age?.age?.[0] ? str(age.age[0]) : null,
    birthDate: age?.birthDate ? str(age.birthDate) : null,
    creationIp: creationIp?.userCreationIp
      ? str(creationIp.userCreationIp)
      : null,
  };
}

function transformProfile(data: any[]): ProfileInfo | null {
  const p = first(data)?.profile;
  if (!p) return null;

  return {
    bio: str(p.description?.bio),
    website: str(p.description?.website),
    location: str(p.description?.location),
    avatarMediaUrl: str(p.avatarMediaUrl),
    headerMediaUrl: str(p.headerMediaUrl),
  };
}

function transformTweet(entry: R): Tweet {
  const t = entry.tweet ?? entry;
  const entities = t.entities ?? {};
  const extMedia = arr(t.extended_entities?.media);
  const mediaArr = extMedia.length > 0 ? extMedia : arr(entities.media);

  return {
    id: str(t.id_str ?? t.id),
    fullText: str(t.full_text),
    createdAt: str(t.created_at),
    favoriteCount: num(t.favorite_count),
    retweetCount: num(t.retweet_count),
    lang: str(t.lang),
    source: parseSource(str(t.source)),
    isRetweet: str(t.full_text).startsWith("RT @"),
    inReplyToStatusId: t.in_reply_to_status_id_str ?? null,
    inReplyToUserId: t.in_reply_to_user_id_str ?? null,
    inReplyToScreenName: t.in_reply_to_screen_name ?? null,
    hashtags: arr(entities.hashtags).map((h: R) => str(h.text)),
    mentions: arr(entities.user_mentions).map(transformMention),
    urls: arr(entities.urls).map(transformUrl),
    media: mediaArr.map((m: R) => transformTweetMedia(m, str(t.id_str ?? t.id))),
  };
}

function transformMention(m: R): TweetMention {
  return {
    screenName: str(m.screen_name),
    name: str(m.name),
    id: str(m.id_str ?? m.id),
  };
}

function transformUrl(u: R): TweetUrl {
  return {
    url: str(u.url),
    expandedUrl: str(u.expanded_url),
    displayUrl: str(u.display_url),
  };
}

function transformTweetMedia(m: R, parentTweetId: string): TweetMedia {
  const mediaUrl = str(m.media_url_https || m.media_url);
  const basename = mediaUrl.split("/").pop() ?? "";

  return {
    id: str(m.id_str ?? m.id),
    url: mediaUrl,
    type: m.type || "photo",
    width: num(m.sizes?.large?.w ?? m.sizes?.medium?.w),
    height: num(m.sizes?.large?.h ?? m.sizes?.medium?.h),
    localPath: basename ? `data/tweets_media/${parentTweetId}-${basename}` : null,
    videoVariants: m.video_info
      ? arr(m.video_info.variants).map(
          (v: R): VideoVariant => ({
            contentType: str(v.content_type),
            url: str(v.url),
            bitrate: v.bitrate ? num(v.bitrate) : undefined,
          }),
        )
      : undefined,
  };
}

function transformLike(entry: R): Like {
  const l = entry.like ?? entry;
  return {
    tweetId: str(l.tweetId),
    fullText: l.fullText ? str(l.fullText) : null,
    expandedUrl: str(l.expandedUrl),
  };
}

function transformDMConversation(entry: R): DMConversation {
  const c = entry.dmConversation ?? entry;
  return {
    conversationId: str(c.conversationId),
    messages: arr(c.messages).map(transformDMMessage),
  };
}

function transformDMMessage(entry: R): DMMessage {
  const m = entry.messageCreate ?? entry.welcomeMessageCreate ?? entry;
  const isWelcome = !!entry.welcomeMessageCreate;

  return {
    id: str(m.id),
    senderId: str(m.senderId),
    recipientId: str(m.recipientId),
    text: str(m.text),
    createdAt: str(m.createdAt),
    mediaUrls: arr(m.mediaUrls).map(String),
    reactions: isWelcome ? [] : arr(m.reactions).map(transformDMReaction),
    isWelcomeMessage: isWelcome,
  };
}

function transformDMReaction(r: R): DMReaction {
  return {
    senderId: str(r.senderId),
    reactionKey: str(r.reactionKey),
    createdAt: str(r.createdAt),
  };
}

function transformSocialEntry(
  wrapperKey: string,
): (entry: R) => SocialEntry {
  return (entry: R) => {
    const e = entry[wrapperKey] ?? entry;
    return {
      accountId: str(e.accountId),
      userLink: str(e.userLink),
    };
  };
}

function transformAdEngagementBatch(entry: R): AdEngagementBatch {
  const engagements = arr(
    entry.ad?.adsUserData?.adEngagements?.engagements,
  );

  return {
    engagements: engagements.map((e: R): AdEngagement => {
      const attrs = e.impressionAttributes ?? e;
      return {
        advertiserName: str(attrs.advertiserInfo?.advertiserName),
        advertiserScreenName: str(attrs.advertiserInfo?.screenName),
        impressionTime: str(attrs.impressionTime),
        displayLocation: str(attrs.displayLocation),
        tweetText: attrs.promotedTweetInfo?.tweetText ?? null,
        targetingCriteria: arr(attrs.matchedTargetingCriteria).map(
          transformTargetingCriterion,
        ),
        engagementTypes: arr(e.engagementAttributes).map((a: R) =>
          str(a.engagementType),
        ),
      };
    }),
  };
}

function transformAdImpressionBatch(entry: R): AdImpressionBatch {
  const impressions = arr(
    entry.ad?.adsUserData?.adImpressions?.impressions,
  );

  return {
    impressions: impressions.map(
      (i: R): AdImpression => ({
        advertiserName: str(i.advertiserInfo?.advertiserName),
        advertiserScreenName: str(i.advertiserInfo?.screenName),
        impressionTime: str(i.impressionTime),
        displayLocation: str(i.displayLocation),
        tweetText: i.promotedTweetInfo?.tweetText ?? null,
        deviceType: i.deviceInfo?.deviceType ?? null,
        targetingCriteria: arr(i.matchedTargetingCriteria).map(
          transformTargetingCriterion,
        ),
      }),
    ),
  };
}

function transformTargetingCriterion(c: R): TargetingCriterion {
  return {
    targetingType: str(c.targetingType),
    targetingValue: c.targetingValue ? str(c.targetingValue) : null,
  };
}

function transformPersonalization(data: any[]): Personalization | null {
  const p = first(data)?.p13nData;
  if (!p) return null;

  const aud = p.interests?.audienceAndAdvertisers;

  return {
    interests: arr(p.interests?.interests).map(
      (i: R): PersonalizationInterest => ({
        name: str(i.name),
        isDisabled: !!i.isDisabled,
      }),
    ),
    // partnerInterests entries can be either { name } objects or bare strings,
    // depending on archive version. Coerce both shapes.
    partnerInterests: arr(p.interests?.partnerInterests)
      .map((i: R): string => (typeof i === "string" ? i : str(i?.name)))
      .filter((s: string) => s.length > 0),
    shows: arr(p.interests?.shows).map(String),
    languages: arr(p.demographics?.languages).map(
      (l: R): PersonalizationLanguage => ({
        language: str(l.language),
        isDisabled: !!l.isDisabled,
      }),
    ),
    gender: p.demographics?.genderInfo?.gender ?? null,
    inferredAge: p.inferredAgeInfo?.age?.[0] ?? null,
    lookalikeAdvertisers: arr(aud?.lookalikeAdvertisers).map(String),
    advertisers: arr(aud?.advertisers).map(String),
    doNotReachAdvertisers: arr(aud?.doNotReachAdvertisers).map(String),
    numAudiences: num(aud?.numAudiences),
    // The README doesn't fully document locationHistory's entry shape; extract
    // whatever is present per entry. Falls back to all-null entries if the shape
    // is alien.
    locationHistory: arr(p.locationHistory).map(
      (h: R): LocationHistoryEntry => ({
        country: typeof h?.country === "string" ? h.country : null,
        region:
          typeof h?.region === "string"
            ? h.region
            : typeof h?.regionName === "string"
              ? h.regionName
              : null,
        city: typeof h?.city === "string" ? h.city : null,
        capturedAt:
          typeof h?.createdAt === "string"
            ? h.createdAt
            : typeof h?.timestamp === "string"
              ? h.timestamp
              : null,
      }),
    ),
  };
}

function transformIpAudit(entry: R): IpAuditEntry {
  const e = entry.ipAudit ?? entry;
  return {
    createdAt: str(e.createdAt),
    loginIp: str(e.loginIp),
  };
}

function transformDeviceToken(entry: R): DeviceToken {
  const d = entry.deviceToken ?? entry;
  return {
    clientApplicationId: str(d.clientApplicationId),
    clientApplicationName: str(d.clientApplicationName),
    token: str(d.token),
    createdAt: str(d.createdAt),
    lastSeenAt: str(d.lastSeenAt),
  };
}

function transformConnectedApp(entry: R): ConnectedApp {
  const a = entry.connectedApplication ?? entry;
  return {
    id: str(a.id),
    name: str(a.name),
    description: str(a.description),
    organizationName: str(a.organization?.name),
    organizationUrl: a.organization?.url ?? null,
    permissions: arr(a.permissions).map(String),
    approvedAt: str(a.approvedAt),
  };
}

function transformNiDevice(entry: R): NiDevice {
  const r = entry.niDeviceResponse ?? entry;
  if (r.pushDevice) {
    const d = r.pushDevice;
    return {
      type: "push",
      deviceType: str(d.deviceType),
      createdDate: str(d.createdDate),
      updatedDate: d.updatedDate ? str(d.updatedDate) : null,
      udid: str(d.udid),
      carrier: null,
      phoneNumber: null,
    };
  }
  const d = r.messagingDevice ?? {};
  return {
    type: "messaging",
    deviceType: str(d.deviceType),
    createdDate: str(d.createdDate),
    updatedDate: null,
    udid: null,
    carrier: d.carrier ? str(d.carrier) : null,
    phoneNumber: d.phoneNumber ? str(d.phoneNumber) : null,
  };
}

function transformKeyRegistry(data: any[]): KeyRegistryDevice[] {
  const entry = first(data)?.keyRegistryData;
  if (!entry) return [];

  return arr(entry.registeredDevices?.deviceMetadataList).map(
    (d: R): KeyRegistryDevice => ({
      userAgent: str(d.userAgent),
      deviceId: str(d.deviceId),
      createdAt: str(d.createdAt),
    }),
  );
}

function groupGrokConversations(data: any[]): GrokConversation[] {
  const byChat = new Map<string, GrokMessage[]>();

  for (const entry of data) {
    const item = entry.grokChatItem ?? entry;
    const chatId = str(item.chatId);
    if (!chatId) continue;

    const msg: GrokMessage = {
      chatId,
      sender: item.sender?.originalName === "USER" ? "user" : "assistant",
      message: str(item.message),
      createdAt: str(item.createdAt),
      attachments: arr(item.attachments).map(
        (a: R): GrokAttachment => ({
          mediaId: str(a.mediaId),
          fileName: str(a.fileName),
          mimeType: str(a.mimeType),
          url: str(a.url),
        }),
      ),
      postIds: arr(item.postIds).map(String),
    };

    let messages = byChat.get(chatId);
    if (!messages) {
      messages = [];
      byChat.set(chatId, messages);
    }
    messages.push(msg);
  }

  return Array.from(byChat.entries()).map(([chatId, messages]) => ({
    chatId,
    messages: messages.sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt),
    ),
  }));
}

function transformScreenNameChange(entry: R): ScreenNameChange {
  const c = entry.screenNameChange?.screenNameChange ?? entry;
  return {
    changedAt: str(c.changedAt),
    changedFrom: str(c.changedFrom),
    changedTo: str(c.changedTo),
  };
}

function transformList(
  type: ListInfo["type"],
): (entry: R) => ListInfo {
  return (entry: R) => ({
    url: str(entry.userListInfo?.url ?? entry.url),
    type,
  });
}

// --- Off-Twitter tracking transformers --------------------------------------
//
// The README documents the *fields* in each file but not the precise wrapper
// shape of each entry. These parsers extract from `entry.ad ?? entry` (or the
// equivalent for branchLink/app) so they tolerate either:
//   [{ ad: { ...fields } }, ...]
// or:
//   [{ ...fields }, ...]
// without crashing. Empty in / empty out either way.

function transformMobileConversion(
  attributed: boolean,
): (entry: R) => MobileConversionEvent {
  return (entry: R) => {
    const a = entry.ad ?? entry;
    return {
      attributed,
      conversionType: attributed
        ? a.attributedConversionType
          ? str(a.attributedConversionType)
          : null
        : null,
      mobilePlatform: str(a.mobilePlatform),
      conversionEventName: str(a.conversionEvent ?? a.conversionEventName),
      applicationName: str(a.applicationName),
      conversionValue: a.conversionValue ? String(a.conversionValue) : null,
      conversionTime: str(a.conversionTime),
    };
  };
}

function transformOnlineConversion(
  attributed: boolean,
): (entry: R) => OnlineConversionEvent {
  return (entry: R) => {
    const a = entry.ad ?? entry;
    return {
      attributed,
      conversionType: attributed
        ? a.attributedConversionType
          ? str(a.attributedConversionType)
          : null
        : null,
      eventType: str(a.eventType),
      conversionPlatform: str(a.conversionPlatform),
      conversionUrl: a.conversionUrl ? str(a.conversionUrl) : null,
      advertiserName: a.advertiserInfo?.advertiserName
        ? str(a.advertiserInfo.advertiserName)
        : null,
      conversionValue: a.conversionValue ? String(a.conversionValue) : null,
      conversionTime: str(a.conversionTime),
    };
  };
}

function transformBranchLink(entry: R): BranchLinkEvent {
  const b = entry.branchLink ?? entry;
  return {
    timestamp: str(b.timestamp),
    landingPage: str(b.landingPage),
    externalReferrerUrl: str(b.externalReferrerUrl),
    channel: str(b.channel),
    feature: str(b.feature),
    campaign: str(b.campaign),
  };
}

function transformInferredApp(entry: R): InferredApp {
  const a = entry.app ?? entry;
  return {
    appId: str(a.appId),
    appNames: arr(a.appNames).map(String),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
