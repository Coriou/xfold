// ---------------------------------------------------------------------------
// Synthetic archive fixtures for unit tests
// ---------------------------------------------------------------------------
// IMPORTANT: per CLAUDE.md, real archive data is FORBIDDEN in tests, fixtures,
// or any committed code. Everything in this file uses fake usernames, fake IDs,
// fake IPs, fake dates. Add helpers as new tests need them.
// ---------------------------------------------------------------------------

import type {
  AccountInfo,
  AdEngagement,
  AdEngagementBatch,
  AdImpression,
  AdImpressionBatch,
  ConnectedApp,
  DMConversation,
  DMMessage,
  DeviceToken,
  GrokConversation,
  GrokMessage,
  IpAuditEntry,
  KeyRegistryDevice,
  Like,
  ListInfo,
  NiDevice,
  ParsedArchive,
  Personalization,
  ProfileInfo,
  ScreenNameChange,
  SocialEntry,
  TargetingCriterion,
  Tweet,
} from "@/lib/archive/types";

// --- Top-level archive ------------------------------------------------------

export function buildSyntheticArchive(
  overrides: Partial<ParsedArchive> = {},
): ParsedArchive {
  const base: ParsedArchive = {
    meta: {
      generationDate: "2026-04-02T00:00:00.000Z",
      sizeBytes: 1024 * 1024,
      isPartialArchive: false,
      accountId: "1000",
      username: "test_user",
      displayName: "Test User",
    },
    stats: {
      totalFiles: 0,
      parsedFiles: 0,
      emptyFiles: 0,
      mediaFileCount: 0,
      counts: {},
    },
    account: null,
    profile: null,
    personalization: null,
    tweets: [],
    likes: [],
    directMessages: [],
    followers: [],
    following: [],
    blocks: [],
    adEngagements: [],
    adImpressions: [],
    ipAudit: [],
    deviceTokens: [],
    connectedApps: [],
    niDevices: [],
    keyRegistryDevices: [],
    grokConversations: [],
    screenNameChanges: [],
    lists: [],
    offTwitter: {
      mobileConversionsAttributed: [],
      mobileConversionsUnattributed: [],
      onlineConversionsAttributed: [],
      onlineConversionsUnattributed: [],
      branchLinks: [],
      inferredApps: [],
    },
    raw: {},
  };
  return { ...base, ...overrides };
}

// --- Per-entity factories ---------------------------------------------------

export function syntheticAccount(
  overrides: Partial<AccountInfo> = {},
): AccountInfo {
  return {
    accountId: "1000",
    username: "test_user",
    displayName: "Test User",
    email: "test@example.invalid",
    createdAt: "2015-01-01T00:00:00.000Z",
    createdVia: "web",
    timezone: "UTC",
    phoneNumber: null,
    verified: false,
    ageRange: null,
    birthDate: null,
    creationIp: null,
    ...overrides,
  };
}

export function syntheticProfile(
  overrides: Partial<ProfileInfo> = {},
): ProfileInfo {
  return {
    bio: "synthetic bio",
    website: "",
    location: "",
    avatarMediaUrl: "",
    headerMediaUrl: "",
    ...overrides,
  };
}

export function syntheticTweet(overrides: Partial<Tweet> = {}): Tweet {
  return {
    id: "1",
    fullText: "hello world",
    createdAt: "2020-06-15T12:00:00.000Z",
    favoriteCount: 0,
    retweetCount: 0,
    lang: "en",
    source: "Twitter Web App",
    isRetweet: false,
    inReplyToStatusId: null,
    inReplyToUserId: null,
    inReplyToScreenName: null,
    hashtags: [],
    mentions: [],
    urls: [],
    media: [],
    ...overrides,
  };
}

export function syntheticLike(overrides: Partial<Like> = {}): Like {
  return {
    tweetId: "9000",
    fullText: "synthetic liked tweet",
    expandedUrl: "https://twitter.com/someone/status/9000",
    ...overrides,
  };
}

export function syntheticDMMessage(
  overrides: Partial<DMMessage> = {},
): DMMessage {
  return {
    id: "msg-1",
    senderId: "1000",
    recipientId: "2000",
    text: "synthetic dm",
    createdAt: "2021-03-10T09:00:00.000Z",
    mediaUrls: [],
    reactions: [],
    isWelcomeMessage: false,
    ...overrides,
  };
}

export function syntheticDMConversation(
  overrides: Partial<DMConversation> = {},
): DMConversation {
  return {
    conversationId: "1000-2000",
    messages: [syntheticDMMessage()],
    ...overrides,
  };
}

export function syntheticSocialEntry(
  overrides: Partial<SocialEntry> = {},
): SocialEntry {
  return {
    accountId: "2000",
    userLink: "https://twitter.com/intent/user?user_id=2000",
    ...overrides,
  };
}

export function syntheticTargetingCriterion(
  overrides: Partial<TargetingCriterion> = {},
): TargetingCriterion {
  return {
    targetingType: "Interests",
    targetingValue: "Technology",
    ...overrides,
  };
}

export function syntheticAdImpression(
  overrides: Partial<AdImpression> = {},
): AdImpression {
  return {
    advertiserName: "Acme Co",
    advertiserScreenName: "acme",
    impressionTime: "2023-01-15T10:00:00.000Z",
    displayLocation: "Timeline",
    tweetText: null,
    deviceType: null,
    deviceId: null,
    targetingCriteria: [],
    ...overrides,
  };
}

export function syntheticAdImpressionBatch(
  impressions: AdImpression[] = [syntheticAdImpression()],
): AdImpressionBatch {
  return { impressions };
}

export function syntheticAdEngagement(
  overrides: Partial<AdEngagement> = {},
): AdEngagement {
  return {
    advertiserName: "Acme Co",
    advertiserScreenName: "acme",
    impressionTime: "2023-01-15T10:00:00.000Z",
    displayLocation: "Timeline",
    tweetText: null,
    targetingCriteria: [],
    engagementTypes: ["ChargeableImpression"],
    ...overrides,
  };
}

export function syntheticAdEngagementBatch(
  engagements: AdEngagement[] = [syntheticAdEngagement()],
): AdEngagementBatch {
  return { engagements };
}

export function syntheticIpAuditEntry(
  overrides: Partial<IpAuditEntry> = {},
): IpAuditEntry {
  return {
    createdAt: "2024-01-01T00:00:00.000Z",
    loginIp: "192.0.2.1",
    ...overrides,
  };
}

export function syntheticDeviceToken(
  overrides: Partial<DeviceToken> = {},
): DeviceToken {
  return {
    clientApplicationId: "app-1",
    clientApplicationName: "Twitter Web App",
    token: "token-1",
    createdAt: "2022-01-01T00:00:00.000Z",
    lastSeenAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function syntheticConnectedApp(
  overrides: Partial<ConnectedApp> = {},
): ConnectedApp {
  return {
    id: "ca-1",
    name: "Synthetic App",
    description: "an app",
    organizationName: "Synthetic Org",
    organizationUrl: null,
    permissions: ["Read"],
    approvedAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function syntheticNiDevice(
  overrides: Partial<NiDevice> = {},
): NiDevice {
  return {
    type: "push",
    deviceType: "iPhone",
    createdDate: "2022.01.01",
    updatedDate: "2024.01.01",
    udid: "udid-1",
    carrier: null,
    phoneNumber: null,
    ...overrides,
  };
}

export function syntheticKeyRegistryDevice(
  overrides: Partial<KeyRegistryDevice> = {},
): KeyRegistryDevice {
  return {
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120",
    deviceId: "kr-1",
    createdAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function syntheticGrokMessage(
  overrides: Partial<GrokMessage> = {},
): GrokMessage {
  return {
    chatId: "chat-1",
    sender: "user",
    message: "synthetic grok message",
    createdAt: "2024-06-01T00:00:00.000Z",
    attachments: [],
    postIds: [],
    ...overrides,
  };
}

export function syntheticGrokConversation(
  overrides: Partial<GrokConversation> = {},
): GrokConversation {
  return {
    chatId: "chat-1",
    messages: [syntheticGrokMessage()],
    ...overrides,
  };
}

export function syntheticScreenNameChange(
  overrides: Partial<ScreenNameChange> = {},
): ScreenNameChange {
  return {
    changedAt: "2018-06-15T00:00:00.000Z",
    changedFrom: "old_handle",
    changedTo: "new_handle",
    ...overrides,
  };
}

export function syntheticListInfo(
  overrides: Partial<ListInfo> = {},
): ListInfo {
  return {
    url: "https://twitter.com/i/lists/1",
    type: "created",
    ...overrides,
  };
}

export function syntheticPersonalization(
  overrides: Partial<Personalization> = {},
): Personalization {
  return {
    interests: [],
    partnerInterests: [],
    shows: [],
    languages: [],
    gender: null,
    inferredAge: null,
    lookalikeAdvertisers: [],
    advertisers: [],
    doNotReachAdvertisers: [],
    numAudiences: 0,
    locationHistory: [],
    ...overrides,
  };
}
