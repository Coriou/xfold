import { describe, expect, it } from "vitest";
import { detectGhostData } from "@/lib/archive/insights/ghost-data";
import {
  buildSyntheticArchive,
  syntheticPersonalization,
} from "@/lib/archive/__fixtures/synthetic-archive";
import type {
  DeletedTweet,
  UploadedContact,
  MobileConversionEvent,
} from "@/lib/archive/types";

function syntheticDeletedTweet(
  overrides: Partial<DeletedTweet> = {},
): DeletedTweet {
  return {
    id: "del-1",
    fullText: "a deleted tweet",
    createdAt: "2020-01-01T00:00:00.000Z",
    deletedAt: null,
    isRetweet: false,
    hashtags: [],
    mentions: [],
    ...overrides,
  };
}

function syntheticContact(
  overrides: Partial<UploadedContact> = {},
): UploadedContact {
  return {
    id: "c-1",
    emails: ["test@example.invalid"],
    phoneNumbers: ["+15551234567"],
    firstName: "Jane",
    lastName: "Doe",
    importedAt: null,
    ...overrides,
  };
}

function syntheticMobileConversion(
  overrides: Partial<MobileConversionEvent> = {},
): MobileConversionEvent {
  return {
    attributed: false,
    conversionType: null,
    mobilePlatform: "iOS",
    conversionEventName: "install",
    applicationName: "SomeApp",
    conversionValue: null,
    conversionTime: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("detectGhostData", () => {
  it("returns empty for blank archive", () => {
    const result = detectGhostData(buildSyntheticArchive());
    expect(result).toEqual([]);
  });

  it("detects deleted tweets", () => {
    const archive = buildSyntheticArchive({
      deletedTweets: [
        syntheticDeletedTweet(),
        syntheticDeletedTweet({ id: "del-2" }),
      ],
    });
    const result = detectGhostData(archive);
    const found = result.find((c) => c.id === "deleted-tweets");
    expect(found).toBeDefined();
    expect(found?.count).toBe(2);
    expect(found?.severity).toBe("critical");
  });

  it("detects uploaded contacts", () => {
    const archive = buildSyntheticArchive({
      contacts: [syntheticContact()],
    });
    const result = detectGhostData(archive);
    const found = result.find((c) => c.id === "contacts");
    expect(found).toBeDefined();
    expect(found?.severity).toBe("critical");
  });

  it("detects off-twitter tracking", () => {
    const archive = buildSyntheticArchive({
      offTwitter: {
        mobileConversionsAttributed: [],
        mobileConversionsUnattributed: [syntheticMobileConversion()],
        onlineConversionsAttributed: [],
        onlineConversionsUnattributed: [],
        branchLinks: [],
        inferredApps: [],
      },
    });
    const result = detectGhostData(archive);
    const found = result.find((c) => c.id === "off-twitter-conversions");
    expect(found).toBeDefined();
    expect(found?.severity).toBe("critical");
  });

  it("detects partner interests from data brokers", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        partnerInterests: ["tech", "finance", "travel"],
      }),
    });
    const result = detectGhostData(archive);
    const found = result.find((c) => c.id === "partner-interests");
    expect(found).toBeDefined();
    expect(found?.count).toBe(3);
    expect(found?.severity).toBe("critical");
  });

  it("sorts critical before warning before info", () => {
    const archive = buildSyntheticArchive({
      deletedTweets: [syntheticDeletedTweet()],
      mutes: [
        {
          accountId: "100",
          userLink: "https://twitter.com/intent/user?user_id=100",
        },
      ],
      offTwitter: {
        mobileConversionsAttributed: [],
        mobileConversionsUnattributed: [],
        onlineConversionsAttributed: [],
        onlineConversionsUnattributed: [],
        branchLinks: [],
        inferredApps: [{ appId: "1", appNames: ["FakeApp"] }],
      },
    });
    const result = detectGhostData(archive);
    expect(result.length).toBeGreaterThanOrEqual(3);
    // Critical items before warning/info
    const firstCritical = result.findIndex((c) => c.severity === "critical");
    const firstWarning = result.findIndex((c) => c.severity === "warning");
    const firstInfo = result.findIndex((c) => c.severity === "info");
    if (firstCritical >= 0 && firstWarning >= 0) {
      expect(firstCritical).toBeLessThan(firstWarning);
    }
    if (firstWarning >= 0 && firstInfo >= 0) {
      expect(firstWarning).toBeLessThan(firstInfo);
    }
  });
});
