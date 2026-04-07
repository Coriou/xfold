import { describe, expect, it } from "vitest";
import {
  computeOffTwitter,
  computeOffTwitterShareability,
} from "@/components/share-cards/cards/off-twitter/compute";
import { computePrivacyScore } from "@/lib/privacy-score";
import { buildSyntheticArchive } from "@/lib/archive/__fixtures/synthetic-archive";

describe("computeOffTwitter", () => {
  it("returns null when archive has no off-twitter data", () => {
    const archive = buildSyntheticArchive();
    const score = computePrivacyScore(archive);
    expect(computeOffTwitter({ archive, score })).toBeNull();
  });

  it("counts inferred apps", () => {
    const archive = buildSyntheticArchive({
      offTwitter: {
        mobileConversionsAttributed: [],
        mobileConversionsUnattributed: [],
        onlineConversionsAttributed: [],
        onlineConversionsUnattributed: [],
        branchLinks: [],
        inferredApps: [
          { appId: "1", appNames: ["TikTok"] },
          { appId: "2", appNames: ["Hinge"] },
        ],
      },
    });
    const score = computePrivacyScore(archive);
    const props = computeOffTwitter({ archive, score });
    expect(props?.apps).toBe(2);
    expect(props?.installs).toBe(0);
    expect(props?.sites).toBe(0);
  });

  it("sums attributed + unattributed mobile and online", () => {
    const archive = buildSyntheticArchive({
      offTwitter: {
        mobileConversionsAttributed: [
          {
            attributed: true,
            conversionType: "Install",
            mobilePlatform: "iOS",
            conversionEventName: "install",
            applicationName: "App A",
            conversionValue: null,
            conversionTime: "2024-01-01T00:00:00.000Z",
          },
        ],
        mobileConversionsUnattributed: [
          {
            attributed: false,
            conversionType: null,
            mobilePlatform: "iOS",
            conversionEventName: "signup",
            applicationName: "App B",
            conversionValue: null,
            conversionTime: "2024-01-02T00:00:00.000Z",
          },
        ],
        onlineConversionsAttributed: [
          {
            attributed: true,
            conversionType: "Pageview",
            eventType: "pageview",
            conversionPlatform: "desktop",
            conversionUrl: null,
            advertiserName: "Acme",
            conversionValue: null,
            conversionTime: "2024-01-03T00:00:00.000Z",
          },
        ],
        onlineConversionsUnattributed: [],
        branchLinks: [],
        inferredApps: [],
      },
    });
    const score = computePrivacyScore(archive);
    const props = computeOffTwitter({ archive, score });
    expect(props?.installs).toBe(2);
    expect(props?.sites).toBe(1);
  });
});

describe("computeOffTwitterShareability", () => {
  it("scales with combined data point count", () => {
    expect(
      computeOffTwitterShareability({
        username: "u",
        apps: 10,
        sites: 10,
        installs: 10,
      }),
    ).toBe(15);
    expect(
      computeOffTwitterShareability({
        username: "u",
        apps: 100,
        sites: 100,
        installs: 100,
      }),
    ).toBe(100);
  });
});
