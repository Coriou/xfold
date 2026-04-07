// ---------------------------------------------------------------------------
// Archive data types
// ---------------------------------------------------------------------------
// These map the raw X/Twitter archive JSON into clean TypeScript interfaces.
// All dates remain strings (the archive uses 3 different date formats).
// All IDs remain strings (the archive stores numbers as strings).
// ---------------------------------------------------------------------------

// --- Parsed archive (top-level) -------------------------------------------

export interface ParsedArchive {
  meta: ArchiveMeta;
  stats: ArchiveStats;

  account: AccountInfo | null;
  profile: ProfileInfo | null;
  personalization: Personalization | null;

  tweets: Tweet[];
  likes: Like[];
  directMessages: DMConversation[];
  followers: SocialEntry[];
  following: SocialEntry[];
  blocks: SocialEntry[];

  adEngagements: AdEngagementBatch[];
  adImpressions: AdImpressionBatch[];

  ipAudit: IpAuditEntry[];
  deviceTokens: DeviceToken[];
  connectedApps: ConnectedApp[];
  niDevices: NiDevice[];
  keyRegistryDevices: KeyRegistryDevice[];

  grokConversations: GrokConversation[];

  screenNameChanges: ScreenNameChange[];
  lists: ListInfo[];

  offTwitter: OffTwitterTracking;

  /** All parsed data keyed by YTD name, for sections that need raw access */
  raw: Record<string, unknown[]>;
}

// --- Meta / stats ---------------------------------------------------------

export interface ArchiveMeta {
  generationDate: string;
  sizeBytes: number;
  isPartialArchive: boolean;
  accountId: string;
  username: string;
  displayName: string;
}

export interface ArchiveStats {
  totalFiles: number;
  parsedFiles: number;
  emptyFiles: number;
  mediaFileCount: number;
  counts: Record<string, number>;
}

// --- Account & profile ----------------------------------------------------

export interface AccountInfo {
  accountId: string;
  username: string;
  displayName: string;
  email: string;
  createdAt: string;
  createdVia: string;
  timezone: string;
  phoneNumber: string | null;
  verified: boolean;
  ageRange: string | null;
  birthDate: string | null;
  creationIp: string | null;
}

export interface ProfileInfo {
  bio: string;
  website: string;
  location: string;
  avatarMediaUrl: string;
  headerMediaUrl: string;
}

// --- Tweets ---------------------------------------------------------------

export interface Tweet {
  id: string;
  fullText: string;
  createdAt: string;
  favoriteCount: number;
  retweetCount: number;
  lang: string;
  source: string;
  isRetweet: boolean;
  inReplyToStatusId: string | null;
  inReplyToUserId: string | null;
  inReplyToScreenName: string | null;
  hashtags: string[];
  mentions: TweetMention[];
  urls: TweetUrl[];
  media: TweetMedia[];
}

export interface TweetMention {
  screenName: string;
  name: string;
  id: string;
}

export interface TweetUrl {
  url: string;
  expandedUrl: string;
  displayUrl: string;
}

export interface TweetMedia {
  id: string;
  url: string;
  type: "photo" | "video" | "animated_gif";
  width: number;
  height: number;
  localPath: string | null;
  videoVariants?: VideoVariant[] | undefined;
}

export interface VideoVariant {
  contentType: string;
  url: string;
  bitrate?: number | undefined;
}

// --- Likes ----------------------------------------------------------------

export interface Like {
  tweetId: string;
  fullText: string | null;
  expandedUrl: string;
}

// --- Direct messages ------------------------------------------------------

export interface DMConversation {
  conversationId: string;
  messages: DMMessage[];
}

export interface DMMessage {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
  mediaUrls: string[];
  reactions: DMReaction[];
  isWelcomeMessage: boolean;
}

export interface DMReaction {
  senderId: string;
  reactionKey: string;
  createdAt: string;
}

// --- Social graph ---------------------------------------------------------

export interface SocialEntry {
  accountId: string;
  userLink: string;
}

// --- Ads ------------------------------------------------------------------

export interface AdEngagementBatch {
  engagements: AdEngagement[];
}

export interface AdEngagement {
  advertiserName: string;
  advertiserScreenName: string;
  impressionTime: string;
  displayLocation: string;
  tweetText: string | null;
  targetingCriteria: TargetingCriterion[];
  engagementTypes: string[];
}

export interface AdImpressionBatch {
  impressions: AdImpression[];
}

export interface AdImpression {
  advertiserName: string;
  advertiserScreenName: string;
  impressionTime: string;
  displayLocation: string;
  tweetText: string | null;
  deviceType: string | null;
  /**
   * Hashed device identifier from `deviceInfo.deviceId`. The same hash is
   * reused by every advertiser served to the same physical device, which
   * makes it the strongest cross-advertiser persistence signal in the
   * archive.
   */
  deviceId: string | null;
  targetingCriteria: TargetingCriterion[];
}

export interface TargetingCriterion {
  targetingType: string;
  targetingValue: string | null;
}

// --- Personalization ------------------------------------------------------

export interface Personalization {
  interests: PersonalizationInterest[];
  /** Interests purchased from third-party data brokers, distinct from X's own inferences. */
  partnerInterests: string[];
  shows: string[];
  languages: PersonalizationLanguage[];
  gender: string | null;
  inferredAge: string | null;
  lookalikeAdvertisers: string[];
  advertisers: string[];
  /** Advertisers paying *not* to reach this account (negative-audience targeting). */
  doNotReachAdvertisers: string[];
  numAudiences: number;
  locationHistory: LocationHistoryEntry[];
}

export interface PersonalizationInterest {
  name: string;
  isDisabled: boolean;
}

export interface PersonalizationLanguage {
  language: string;
  isDisabled: boolean;
}

/**
 * X infers location from the last 60 days of activity. The README doesn't fully
 * document the entry shape, so all fields are nullable — we extract whatever is
 * present per entry.
 */
export interface LocationHistoryEntry {
  country: string | null;
  region: string | null;
  city: string | null;
  capturedAt: string | null;
}

// --- Privacy / security ---------------------------------------------------

export interface IpAuditEntry {
  createdAt: string;
  loginIp: string;
}

export interface DeviceToken {
  clientApplicationId: string;
  clientApplicationName: string;
  token: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface ConnectedApp {
  id: string;
  name: string;
  description: string;
  organizationName: string;
  organizationUrl: string | null;
  permissions: string[];
  approvedAt: string;
}

export interface NiDevice {
  type: "push" | "messaging";
  deviceType: string;
  createdDate: string;
  updatedDate: string | null;
  udid: string | null;
  carrier: string | null;
  phoneNumber: string | null;
}

export interface KeyRegistryDevice {
  userAgent: string;
  deviceId: string;
  createdAt: string;
}

// --- Grok -----------------------------------------------------------------

export interface GrokConversation {
  chatId: string;
  messages: GrokMessage[];
}

export interface GrokMessage {
  chatId: string;
  sender: "user" | "assistant";
  message: string;
  createdAt: string;
  attachments: GrokAttachment[];
  postIds: string[];
}

export interface GrokAttachment {
  mediaId: string;
  fileName: string;
  mimeType: string;
  url: string;
}

// --- Account history ------------------------------------------------------

export interface ScreenNameChange {
  changedAt: string;
  changedFrom: string;
  changedTo: string;
}

export interface ListInfo {
  url: string;
  type: "created" | "member" | "subscribed";
}

// --- Off-Twitter tracking -------------------------------------------------
//
// X ships these files in the archive but doesn't surface them in the official
// HTML viewer. They contain off-platform tracking data (apps you installed,
// websites you visited) that advertisers reported back to X via conversion
// pixels and SDKs.

export interface OffTwitterTracking {
  mobileConversionsAttributed: MobileConversionEvent[];
  mobileConversionsUnattributed: MobileConversionEvent[];
  onlineConversionsAttributed: OnlineConversionEvent[];
  onlineConversionsUnattributed: OnlineConversionEvent[];
  branchLinks: BranchLinkEvent[];
  inferredApps: InferredApp[];
}

export interface MobileConversionEvent {
  /** True for events attributed to a promoted-tweet engagement on X. */
  attributed: boolean;
  /** Type of activity (e.g. "Install"). Attributed events only. */
  conversionType: string | null;
  /** "iOS" / "Android" / other. */
  mobilePlatform: string;
  /** Event name (e.g. "install", "signup"). */
  conversionEventName: string;
  applicationName: string;
  conversionValue: string | null;
  conversionTime: string;
}

export interface OnlineConversionEvent {
  attributed: boolean;
  conversionType: string | null;
  eventType: string;
  conversionPlatform: string;
  /** URL of the website where the event occurred. Unattributed events only. */
  conversionUrl: string | null;
  advertiserName: string | null;
  conversionValue: string | null;
  conversionTime: string;
}

export interface BranchLinkEvent {
  timestamp: string;
  landingPage: string;
  externalReferrerUrl: string;
  channel: string;
  feature: string;
  campaign: string;
}

/**
 * X's guess at apps installed on your devices. The README only documents
 * `appId` and `appNames` — the latter being a list of name variants.
 */
export interface InferredApp {
  appId: string;
  appNames: string[];
}
