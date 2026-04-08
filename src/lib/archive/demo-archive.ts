// ---------------------------------------------------------------------------
// Demo archive — a fully synthetic ParsedArchive bundled with the app
// ---------------------------------------------------------------------------
//
// This is what the "Try with sample data" button on the landing page loads.
// It's hand-built to exercise every dashboard section: tweets, likes, DMs,
// ad data, Grok conversations, devices, connected apps, demographics, etc.
//
// EVERYTHING in this file is invented. No real usernames, IPs, names, or
// content. The archive belongs to a fictional user "demo_user" who started
// using X in 2018 and accumulated a realistic-looking set of artifacts.
//
// Why not import from `__fixtures/`? Per CLAUDE.md, fixtures are for tests
// only. Demo data shipped to production needs its own home and its own
// stable contract.
// ---------------------------------------------------------------------------

import type { ParsedArchive, Tweet, DMMessage } from "./types";

// ---------------------------------------------------------------------------
// Constants — the "story" of the demo user
// ---------------------------------------------------------------------------

const DEMO_ACCOUNT_ID = "999000111";
const DEMO_USERNAME = "demo_user";
const DEMO_DISPLAY = "Demo User";
const DEMO_EMAIL = "demo@example.invalid";
const DEMO_BIRTHDAY = "1992-04-15";
const DEMO_TIMEZONE = "America/New_York";

const ACCOUNT_CREATED = "2018-03-12T14:30:00.000Z";
const ARCHIVE_GENERATED = "2026-04-01T09:00:00.000Z";

// ---------------------------------------------------------------------------
// Tweet bodies — varied so insights have something to chew on
// ---------------------------------------------------------------------------

const ORIGINAL_TWEET_BODIES = [
  "trying to learn machine learning by building things instead of watching courses",
  "the new espresso machine arrived. life ruiner, instant rabbit hole",
  "honestly cannot tell if cycling is a hobby or a coping mechanism at this point",
  "wrote a small typescript utility today and it actually sparked joy",
  "every podcast about productivity is just other podcasts about productivity",
  "the rust borrow checker hates me personally",
  "first attempt at sourdough: the loaf has a personality. mostly anger",
  "finished my first 50km cycling ride. legs are concrete",
  "moved my dotfiles to a new repo. spent 4 hours bikeshedding the readme",
  "neovim has officially eaten my brain",
  "tried tofu scramble. surprised. it's actually good",
  "the only thing harder than running a marathon is talking about running a marathon",
  "spent the entire afternoon reading about coffee origins. unproductive but satisfying",
  "shipped a tiny side project today. zero users. ten dopamine",
  "the ergodox is comfortable but typing on a regular keyboard now feels alien",
  "watched a documentary about urban planning. now I notice everything",
  "writing a blog post is 5% writing and 95% deleting paragraphs",
  "took a very long walk and came back with a completely new opinion",
  "the dishwasher is humming. life is fine",
  "cleaned my entire desk and it lasted 12 hours exactly",
];

const REPLY_TWEET_BODIES = [
  "agreed — the framing in the post was the main issue for me",
  "this is the cleanest take I've read on this all week",
  "have you tried the version with espresso instead? it's a different drink entirely",
  "do you have a link to the original paper?",
  "this matches what I've been thinking honestly",
  "yeah but the trade-off is brittleness. fine for prototypes",
  "noted, I'll try this approach next time",
  "that worked for me too, but only after I bumped the buffer size",
];

const RETWEET_BODIES = [
  "RT @aiweekly: a small but real example of useful ML tooling for individuals",
  "RT @brewlab: 5 things we learned about espresso ratios this week",
  "RT @cyclistmag: the underrated benefit of sub-30km rides",
  "RT @typescript: stricter null checks landed in the next minor",
];

// ---------------------------------------------------------------------------
// Helper builders
// ---------------------------------------------------------------------------

/** Generate evenly-spaced ISO timestamps between two ISO endpoints. */
function spreadDates(startIso: string, endIso: string, count: number): string[] {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const step = (end - start) / Math.max(count - 1, 1);
  return Array.from({ length: count }, (_, i) =>
    new Date(start + step * i).toISOString(),
  );
}

function buildTweets(): Tweet[] {
  const tweets: Tweet[] = [];
  // 50 originals spread across 6 years
  const originalDates = spreadDates(
    "2018-04-01T08:00:00.000Z",
    "2025-12-15T20:00:00.000Z",
    50,
  );
  for (let i = 0; i < 50; i++) {
    const body = ORIGINAL_TWEET_BODIES[i % ORIGINAL_TWEET_BODIES.length] ?? "";
    tweets.push({
      id: `t${1000 + i}`,
      fullText: body,
      createdAt: originalDates[i] ?? ACCOUNT_CREATED,
      favoriteCount: Math.floor((i * 7) % 31),
      retweetCount: Math.floor((i * 3) % 11),
      lang: "en",
      source: i % 4 === 0 ? "Twitter for iPhone" : "Twitter Web App",
      isRetweet: false,
      inReplyToStatusId: null,
      inReplyToUserId: null,
      inReplyToScreenName: null,
      hashtags: i % 5 === 0 ? ["learning"] : i % 7 === 0 ? ["coffee"] : [],
      mentions: [],
      urls: [],
      media: [],
    });
  }
  // 20 replies spread across 4 years
  const replyDates = spreadDates(
    "2020-01-15T10:00:00.000Z",
    "2025-09-01T18:00:00.000Z",
    20,
  );
  for (let i = 0; i < 20; i++) {
    const body = REPLY_TWEET_BODIES[i % REPLY_TWEET_BODIES.length] ?? "";
    tweets.push({
      id: `r${2000 + i}`,
      fullText: body,
      createdAt: replyDates[i] ?? ACCOUNT_CREATED,
      favoriteCount: Math.floor((i * 2) % 9),
      retweetCount: 0,
      lang: "en",
      source: "Twitter Web App",
      isRetweet: false,
      inReplyToStatusId: `9999${i}`,
      inReplyToUserId: `8888${i}`,
      inReplyToScreenName: i % 2 === 0 ? "alice_dev" : "bob_writes",
      hashtags: [],
      mentions: [
        { screenName: i % 2 === 0 ? "alice_dev" : "bob_writes", name: "", id: `8888${i}` },
      ],
      urls: [],
      media: [],
    });
  }
  // 10 retweets spread across 3 years
  const rtDates = spreadDates(
    "2021-06-01T12:00:00.000Z",
    "2025-08-01T12:00:00.000Z",
    10,
  );
  for (let i = 0; i < 10; i++) {
    const body = RETWEET_BODIES[i % RETWEET_BODIES.length] ?? "";
    tweets.push({
      id: `rt${3000 + i}`,
      fullText: body,
      createdAt: rtDates[i] ?? ACCOUNT_CREATED,
      favoriteCount: 0,
      retweetCount: 0,
      lang: "en",
      source: "Twitter for iPhone",
      isRetweet: true,
      inReplyToStatusId: null,
      inReplyToUserId: null,
      inReplyToScreenName: null,
      hashtags: [],
      mentions: [],
      urls: [],
      media: [],
    });
  }
  return tweets.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function buildLikes(): { tweetId: string; fullText: string; expandedUrl: string }[] {
  const liked = [
    "good thread on shipping small instead of perfect",
    "these espresso ratio diagrams are gorgeous",
    "the cycling-as-meditation framing actually makes sense",
    "every dev tool should have a --dry-run flag, no exceptions",
    "writing more makes everything else easier somehow",
    "the typescript 5.x release notes are dense and worth reading",
    "this neovim plugin is exactly what I've been missing",
    "rust ownership feels easier when you stop fighting it",
    "the observability stack we picked is paying off in incident response",
    "minimalist running shoes changed how I think about my form",
  ];
  return liked.map((text, i) => ({
    tweetId: `like-${4000 + i}`,
    fullText: text,
    expandedUrl: `https://twitter.com/anon${i}/status/${4000 + i}`,
  }));
}

function buildDmConversations() {
  const buildConv = (
    conversationId: string,
    otherId: string,
    messages: { text: string; daysAgo: number; fromMe: boolean }[],
  ) => {
    const dms: DMMessage[] = messages.map((m, i) => {
      const ts = new Date(
        Date.now() - m.daysAgo * 24 * 60 * 60 * 1000,
      ).toISOString();
      return {
        id: `dm-${conversationId}-${i}`,
        senderId: m.fromMe ? DEMO_ACCOUNT_ID : otherId,
        recipientId: m.fromMe ? otherId : DEMO_ACCOUNT_ID,
        text: m.text,
        createdAt: ts,
        mediaUrls: [],
        reactions: [],
        isWelcomeMessage: false,
      };
    });
    return { conversationId, messages: dms };
  };

  return [
    buildConv("999000111-555000001", "555000001", [
      { text: "did you try that new espresso place?", daysAgo: 30, fromMe: false },
      { text: "yeah, the geisha pour over was excellent", daysAgo: 30, fromMe: true },
      { text: "I keep meaning to dial in my home setup", daysAgo: 29, fromMe: true },
      { text: "share your recipe when you do!", daysAgo: 29, fromMe: false },
    ]),
    buildConv("999000111-555000002", "555000002", [
      { text: "are you going to the cycling meetup saturday?", daysAgo: 14, fromMe: false },
      { text: "depends if my legs forgive me by then", daysAgo: 14, fromMe: true },
      { text: "lol mine are dead from yesterday's hill repeats", daysAgo: 13, fromMe: false },
    ]),
    buildConv("999000111-555000003", "555000003", [
      { text: "did you ever finish that machine learning side project?", daysAgo: 90, fromMe: false },
      { text: "got the prototype working but then real life happened", daysAgo: 89, fromMe: true },
      { text: "story of every side project ever", daysAgo: 88, fromMe: false },
      { text: "I might pick it back up this winter", daysAgo: 88, fromMe: true },
    ]),
  ];
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Build a fully synthetic ParsedArchive that exercises every dashboard
 * section. The exact same shape that the worker would produce after parsing
 * a real ZIP — just hand-rolled in TypeScript so the bundle ships it
 * directly.
 */
export function buildDemoArchive(): ParsedArchive {
  const tweets = buildTweets();
  const likes = buildLikes();
  const directMessages = buildDmConversations();

  const totalTweets = tweets.length;

  return {
    meta: {
      generationDate: ARCHIVE_GENERATED,
      sizeBytes: 12 * 1024 * 1024, // 12 MB pretend
      isPartialArchive: false,
      accountId: DEMO_ACCOUNT_ID,
      username: DEMO_USERNAME,
      displayName: DEMO_DISPLAY,
    },
    stats: {
      totalFiles: 42,
      parsedFiles: 42,
      emptyFiles: 0,
      mediaFileCount: 0,
      counts: { tweets: totalTweets, likes: likes.length },
    },
    account: {
      accountId: DEMO_ACCOUNT_ID,
      username: DEMO_USERNAME,
      displayName: DEMO_DISPLAY,
      email: DEMO_EMAIL,
      createdAt: ACCOUNT_CREATED,
      createdVia: "web",
      timezone: DEMO_TIMEZONE,
      phoneNumber: "+15555550100",
      verified: false,
      ageRange: "30-39",
      birthDate: DEMO_BIRTHDAY,
      creationIp: "203.0.113.42",
    },
    profile: {
      bio: "tinkering with code, coffee, and 50km cycling routes. (this is a demo profile)",
      website: "https://example.invalid",
      location: "Brooklyn, NY (fictional)",
      avatarMediaUrl: "",
      headerMediaUrl: "",
    },
    personalization: {
      interests: [
        { name: "Machine Learning", isDisabled: false },
        { name: "Coffee", isDisabled: false },
        { name: "Cycling", isDisabled: false },
        { name: "TypeScript", isDisabled: false },
        { name: "Open Source Software", isDisabled: false },
        { name: "Cooking", isDisabled: false },
        { name: "Vim", isDisabled: false },
        { name: "Linux", isDisabled: false },
        { name: "Sourdough Bread", isDisabled: false },
        { name: "Writing", isDisabled: false },
        { name: "Crypto Trading", isDisabled: true },
        { name: "Cruise Vacations", isDisabled: true },
        { name: "Luxury Watches", isDisabled: true },
        { name: "MMA Fighting", isDisabled: true },
        { name: "Online Casinos", isDisabled: true },
        { name: "Wellness Supplements", isDisabled: false },
        { name: "Real Estate Investment", isDisabled: false },
        { name: "Cryptocurrency Wallets", isDisabled: false },
        { name: "Luxury Travel", isDisabled: false },
        { name: "Self-help Books", isDisabled: false },
      ],
      partnerInterests: [
        "Homeowner",
        "Frequent Traveler",
        "Premium Credit Card Holder",
        "Recent Mover",
        "Pet Owner — Dog",
        "Apple Device Buyer",
      ],
      shows: ["Mr. Robot", "Severance", "Tour de France", "The Bear"],
      languages: [
        { language: "English", isDisabled: false },
        { language: "French", isDisabled: false },
      ],
      gender: "Male",
      inferredAge: "30-39",
      lookalikeAdvertisers: [
        "PaymentApp",
        "CycleGearCo",
        "SaaSStartup",
        "FitnessChain",
        "DTCBrand",
      ],
      advertisers: [
        "PaymentApp",
        "CycleGearCo",
        "EspressoBrand",
        "DevToolsCorp",
        "SaaSStartup",
      ],
      doNotReachAdvertisers: ["CompetitorBank", "SponsoredAdsRivals"],
      numAudiences: 173,
      locationHistory: [
        {
          country: "United States",
          region: "New York",
          city: "Brooklyn",
          capturedAt: "2025-12-01T00:00:00.000Z",
        },
        {
          country: "France",
          region: "Île-de-France",
          city: "Paris",
          capturedAt: "2024-08-12T00:00:00.000Z",
        },
        {
          country: "United States",
          region: "California",
          city: "San Francisco",
          capturedAt: "2024-03-04T00:00:00.000Z",
        },
      ],
    },
    tweets,
    likes,
    directMessages,
    followers: Array.from({ length: 12 }, (_, i) => ({
      accountId: `${600000 + i}`,
      userLink: `https://twitter.com/intent/user?user_id=${600000 + i}`,
    })),
    following: Array.from({ length: 18 }, (_, i) => ({
      accountId: `${700000 + i}`,
      userLink: `https://twitter.com/intent/user?user_id=${700000 + i}`,
    })),
    blocks: [
      {
        accountId: "880001",
        userLink: "https://twitter.com/intent/user?user_id=880001",
      },
    ],
    adEngagements: [
      {
        engagements: [
          {
            advertiserName: "EspressoBrand",
            advertiserScreenName: "espressobrand",
            impressionTime: "2025-11-12T14:32:00.000Z",
            displayLocation: "Timeline",
            tweetText: "fall espresso lineup is here",
            targetingCriteria: [
              { targetingType: "Interests", targetingValue: "Coffee" },
              { targetingType: "Age", targetingValue: "30-39" },
            ],
            engagementTypes: ["ChargeableImpression", "Click"],
          },
        ],
      },
    ],
    adImpressions: buildDemoAdImpressions(),
    ipAudit: buildDemoIpAudit(),
    deviceTokens: [
      {
        clientApplicationId: "web-1",
        clientApplicationName: "Twitter Web App",
        token: "demo-token-web",
        createdAt: "2018-03-12T14:31:00.000Z",
        lastSeenAt: "2026-03-30T18:20:00.000Z",
      },
      {
        clientApplicationId: "ios-1",
        clientApplicationName: "Twitter for iPhone",
        token: "demo-token-ios",
        createdAt: "2019-06-01T09:00:00.000Z",
        lastSeenAt: "2026-03-29T22:10:00.000Z",
      },
    ],
    connectedApps: [
      {
        id: "ca-1",
        name: "Buffer",
        description: "Schedule tweets ahead of time",
        organizationName: "Buffer Inc",
        organizationUrl: "https://buffer.com",
        permissions: ["Read", "Write"],
        approvedAt: "2019-04-12T00:00:00.000Z",
      },
      {
        id: "ca-2",
        name: "Tweetbot 5",
        description: "Twitter client (discontinued)",
        organizationName: "Tapbots",
        organizationUrl: null,
        permissions: ["Read", "Write", "Direct Messages"],
        approvedAt: "2018-11-02T00:00:00.000Z",
      },
      {
        id: "ca-3",
        name: "OldRSSReader",
        description: "RSS reader that hasn't shipped in years",
        organizationName: "Defunct Co",
        organizationUrl: null,
        permissions: ["Read"],
        approvedAt: "2018-08-15T00:00:00.000Z",
      },
    ],
    niDevices: [
      {
        type: "push",
        deviceType: "iPhone 14",
        createdDate: "2023.09.15",
        updatedDate: "2026.03.20",
        udid: "demo-udid-1",
        carrier: null,
        phoneNumber: null,
      },
    ],
    keyRegistryDevices: [
      {
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124",
        deviceId: "demo-kr-mac",
        createdAt: "2024-09-01T08:00:00.000Z",
      },
      {
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/605.1.15",
        deviceId: "demo-kr-iphone",
        createdAt: "2023-09-22T19:30:00.000Z",
      },
    ],
    grokConversations: [
      {
        chatId: "grok-1",
        messages: [
          {
            chatId: "grok-1",
            sender: "user",
            message: "explain machine learning to me like I'm a backend dev",
            createdAt: "2025-02-14T19:22:00.000Z",
            attachments: [],
            postIds: [],
          },
          {
            chatId: "grok-1",
            sender: "assistant",
            message:
              "Think of it as fitting parameters to data... (synthetic Grok reply)",
            createdAt: "2025-02-14T19:22:30.000Z",
            attachments: [],
            postIds: [],
          },
        ],
      },
      {
        chatId: "grok-2",
        messages: [
          {
            chatId: "grok-2",
            sender: "user",
            message: "what are common espresso extraction problems?",
            createdAt: "2025-08-09T08:14:00.000Z",
            attachments: [],
            postIds: [],
          },
          {
            chatId: "grok-2",
            sender: "assistant",
            message: "Channeling, under-dosing... (synthetic Grok reply)",
            createdAt: "2025-08-09T08:14:30.000Z",
            attachments: [],
            postIds: [],
          },
        ],
      },
    ],
    screenNameChanges: [
      {
        changedAt: "2019-06-01T00:00:00.000Z",
        changedFrom: "demo_handle",
        changedTo: DEMO_USERNAME,
      },
    ],
    lists: [
      { url: "https://twitter.com/i/lists/1001", type: "created" },
      { url: "https://twitter.com/i/lists/2002", type: "subscribed" },
    ],
    offTwitter: {
      mobileConversionsAttributed: [
        {
          attributed: true,
          conversionType: "Install",
          mobilePlatform: "iOS",
          conversionEventName: "install",
          applicationName: "PaymentApp",
          conversionValue: null,
          conversionTime: "2024-11-05T15:00:00.000Z",
        },
      ],
      mobileConversionsUnattributed: [
        {
          attributed: false,
          conversionType: null,
          mobilePlatform: "iOS",
          conversionEventName: "open",
          applicationName: "FitnessTracker",
          conversionValue: null,
          conversionTime: "2025-01-12T07:30:00.000Z",
        },
      ],
      onlineConversionsAttributed: [
        {
          attributed: true,
          conversionType: "Purchase",
          eventType: "purchase",
          conversionPlatform: "web",
          conversionUrl: null,
          advertiserName: "EspressoBrand",
          conversionValue: "42.00",
          conversionTime: "2025-09-04T12:00:00.000Z",
        },
      ],
      onlineConversionsUnattributed: [
        {
          attributed: false,
          conversionType: null,
          eventType: "page_view",
          conversionPlatform: "web",
          conversionUrl: "https://example.invalid/product",
          advertiserName: null,
          conversionValue: null,
          conversionTime: "2025-09-03T18:30:00.000Z",
        },
      ],
      branchLinks: [],
      inferredApps: [
        { appId: "com.example.payment", appNames: ["PaymentApp"] },
        { appId: "com.example.fitness", appNames: ["FitnessTracker"] },
        { appId: "com.example.coffee", appNames: ["CoffeeFinder"] },
      ],
    },
    deletedTweets: [
      {
        id: "del-1",
        fullText: "old hot take about machine learning I no longer stand behind",
        createdAt: "2019-08-12T14:00:00.000Z",
        deletedAt: "2020-01-04T22:00:00.000Z",
        isRetweet: false,
        hashtags: ["machinelearning"],
        mentions: [],
      },
      {
        id: "del-2",
        fullText: "deleted because I misread the article",
        createdAt: "2021-04-22T10:30:00.000Z",
        deletedAt: "2021-04-22T11:00:00.000Z",
        isRetweet: false,
        hashtags: [],
        mentions: [],
      },
      {
        id: "del-3",
        fullText: "typo'd a friend's name in front of everyone",
        createdAt: "2022-06-15T16:45:00.000Z",
        deletedAt: "2022-06-15T16:46:00.000Z",
        isRetweet: false,
        hashtags: [],
        mentions: [],
      },
      {
        id: "del-4",
        fullText:
          "venting about a former employer in a thread I would not write today",
        createdAt: "2020-10-11T22:30:00.000Z",
        deletedAt: "2021-02-04T10:15:00.000Z",
        isRetweet: false,
        hashtags: [],
        mentions: [],
      },
      {
        id: "del-5",
        fullText:
          "wrong opinion about cycling cadence — corrected by replies, deleting before more people see",
        createdAt: "2023-03-04T13:20:00.000Z",
        deletedAt: "2023-03-04T13:25:00.000Z",
        isRetweet: false,
        hashtags: ["cycling"],
        mentions: [],
      },
      {
        id: "del-6",
        fullText:
          "regretting how I phrased my thoughts on AI safety, will rewrite later",
        createdAt: "2024-07-19T09:10:00.000Z",
        deletedAt: "2024-07-19T09:30:00.000Z",
        isRetweet: false,
        hashtags: [],
        mentions: [],
      },
      {
        id: "del-7",
        fullText:
          "draft tweet I shouldn't have posted at 2am — typo and a half-formed argument",
        createdAt: "2025-01-08T02:14:00.000Z",
        deletedAt: "2025-01-08T08:00:00.000Z",
        isRetweet: false,
        hashtags: [],
        mentions: [],
      },
    ],
    // Mixed-format synthetic contacts so the Uploaded Contacts section
    // exercises the email-only / phone-only / both code paths.
    contacts: Array.from({ length: 24 }, (_, i) => {
      const mode = i % 4;
      // 0 = both, 1 = email only, 2 = phone only, 3 = both with multiple values
      const emails =
        mode === 2
          ? []
          : mode === 3
            ? [`person${i}@example.invalid`, `alt${i}@example.invalid`]
            : [`person${i}@example.invalid`];
      const phoneNumbers =
        mode === 1
          ? []
          : mode === 3
            ? [
                `+155555502${String(i).padStart(2, "0")}`,
                `+155555503${String(i).padStart(2, "0")}`,
              ]
            : [`+155555502${String(i).padStart(2, "0")}`];
      return {
        id: `contact-${i}`,
        emails,
        phoneNumbers,
        firstName: `Person`,
        lastName: `${i}`,
        importedAt: "2019-05-01T00:00:00.000Z",
      };
    }),
    mutes: [
      {
        accountId: "910001",
        userLink: "https://twitter.com/intent/user?user_id=910001",
      },
    ],
    dmMutes: [],
    groupDirectMessages: [],
    suspensions: [],
    emailChanges: [
      {
        changedAt: "2020-02-01T00:00:00.000Z",
        changedFrom: "older@example.invalid",
        changedTo: DEMO_EMAIL,
      },
    ],
    protectedHistory: [],
    savedSearches: [
      { query: "espresso pour over", savedAt: "2024-04-12T00:00:00.000Z" },
      { query: "rust async runtime", savedAt: "2024-09-30T00:00:00.000Z" },
    ],
    communityNotes: [],
    communityNoteRatings: [],
    raw: {},
  };
}

// ---------------------------------------------------------------------------
// Sub-builders for the noisier sections
// ---------------------------------------------------------------------------

function buildDemoAdImpressions() {
  const advertisers: { name: string; screen: string; targeting: string }[] = [
    { name: "PaymentApp", screen: "paymentapp", targeting: "Interests" },
    { name: "CycleGearCo", screen: "cyclegear", targeting: "Interests" },
    { name: "EspressoBrand", screen: "espressobrand", targeting: "Interests" },
    { name: "DevToolsCorp", screen: "devtools", targeting: "Interests" },
    { name: "SaaSStartup", screen: "saasstartup", targeting: "Conversation topics" },
    { name: "TravelDeals", screen: "traveldeals", targeting: "Locations" },
    { name: "MarathonGear", screen: "marathongear", targeting: "Follower look-alikes" },
    { name: "FoodDelivery", screen: "fooddelivery", targeting: "App Activity" },
  ];

  const dates = spreadDates(
    "2025-01-15T08:00:00.000Z",
    "2026-03-20T20:00:00.000Z",
    advertisers.length * 8,
  );

  return [
    {
      impressions: advertisers.flatMap((adv, advIdx) =>
        Array.from({ length: 8 }, (_, i) => ({
          advertiserName: adv.name,
          advertiserScreenName: adv.screen,
          impressionTime: dates[advIdx * 8 + i] ?? ARCHIVE_GENERATED,
          displayLocation: i % 2 === 0 ? "Timeline" : "Profile",
          tweetText: null,
          deviceType: i % 3 === 0 ? "iPhone" : null,
          deviceId: `device-${advIdx % 3}`,
          targetingCriteria: [
            {
              targetingType: adv.targeting,
              targetingValue:
                adv.targeting === "Interests"
                  ? ["Coffee", "Cycling", "Machine Learning", "TypeScript"][
                      i % 4
                    ] ?? null
                  : adv.targeting === "Locations"
                    ? "United States"
                    : "Tech early adopters",
            },
            { targetingType: "Age", targetingValue: "30-39" },
          ],
        })),
      ),
    },
  ];
}

function buildDemoIpAudit() {
  // Three IPs to make the IP analysis section interesting
  const homeIp = "203.0.113.42";
  const workIp = "198.51.100.17";
  const travelIp = "192.0.2.81";
  const out = [];
  for (let i = 0; i < 30; i++) {
    out.push({
      createdAt: new Date(
        Date.now() - i * 12 * 60 * 60 * 1000,
      ).toISOString(),
      loginIp: i % 5 === 0 ? travelIp : i % 2 === 0 ? workIp : homeIp,
    });
  }
  return out;
}
