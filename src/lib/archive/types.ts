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
  targetingCriteria: TargetingCriterion[];
}

export interface TargetingCriterion {
  targetingType: string;
  targetingValue: string | null;
}

// --- Personalization ------------------------------------------------------

export interface Personalization {
  interests: PersonalizationInterest[];
  shows: string[];
  languages: PersonalizationLanguage[];
  gender: string | null;
  inferredAge: string | null;
  lookalikeAdvertisers: string[];
  advertisers: string[];
  numAudiences: number;
  locationHistory: unknown[];
}

export interface PersonalizationInterest {
  name: string;
  isDisabled: boolean;
}

export interface PersonalizationLanguage {
  language: string;
  isDisabled: boolean;
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
