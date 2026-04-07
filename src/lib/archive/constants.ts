// ---------------------------------------------------------------------------
// Dashboard section & navigation definitions
// ---------------------------------------------------------------------------

export interface NavItem {
  id: string;
  label: string;
  /** Key into ParsedArchive to determine if section has data */
  dataKey?: string;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "privacy",
    label: "Privacy Audit",
    items: [
      { id: "overview", label: "Privacy Score" },
      { id: "activity-patterns", label: "Activity Patterns" },
      { id: "interests", label: "Interests & Shows", dataKey: "personalization" },
      { id: "ad-profile", label: "Your Ad Profile", dataKey: "personalization" },
      { id: "ad-targeting", label: "Ad Targeting", dataKey: "adImpressions" },
      { id: "login-history", label: "Login History", dataKey: "ipAudit" },
      { id: "ip-analysis", label: "IP Intelligence", dataKey: "ipAudit" },
      { id: "devices", label: "Devices", dataKey: "deviceTokens" },
      { id: "connected-apps", label: "Connected Apps", dataKey: "connectedApps" },
      { id: "grok", label: "Grok Conversations", dataKey: "grokConversations" },
      { id: "demographics", label: "Demographics", dataKey: "personalization" },
    ],
  },
  {
    id: "data",
    label: "Your Data",
    items: [
      { id: "tweets", label: "Tweets", dataKey: "tweets" },
      { id: "likes", label: "Likes", dataKey: "likes" },
      { id: "dms", label: "Direct Messages", dataKey: "directMessages" },
      { id: "social-graph", label: "Social Graph", dataKey: "followers" },
      { id: "conversations", label: "Conversations" },
      { id: "lists", label: "Lists", dataKey: "lists" },
      { id: "media", label: "Media", dataKey: "tweets" },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { id: "profile", label: "Profile", dataKey: "profile" },
      { id: "username-history", label: "Username History", dataKey: "screenNameChanges" },
    ],
  },
];

export const DEFAULT_SECTION = "overview";
