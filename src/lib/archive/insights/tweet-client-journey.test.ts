import { describe, expect, it } from "vitest";
import { buildTweetClientJourney } from "@/lib/archive/insights/tweet-client-journey";
import {
  buildSyntheticArchive,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("buildTweetClientJourney", () => {
  it("returns empty list for empty archive", () => {
    expect(buildTweetClientJourney(buildSyntheticArchive())).toEqual([]);
  });

  it("groups by client and counts", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ source: "Twitter Web App" }),
        syntheticTweet({ source: "Twitter Web App" }),
        syntheticTweet({ source: "Twitter for iPhone" }),
      ],
    });
    const result = buildTweetClientJourney(archive);
    expect(result).toHaveLength(2);
    expect(result[0]?.client).toBe("Twitter Web App");
    expect(result[0]?.count).toBe(2);
    expect(result[1]?.client).toBe("Twitter for iPhone");
  });

  it("flags third-party clients", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({ source: "Twitter Web App" }),
        syntheticTweet({ source: "Buffer" }),
      ],
    });
    const result = buildTweetClientJourney(archive);
    const buffer = result.find((e) => e.client === "Buffer");
    const web = result.find((e) => e.client === "Twitter Web App");
    expect(buffer?.isThirdParty).toBe(true);
    expect(web?.isThirdParty).toBe(false);
  });

  it("tracks first-seen and last-seen dates per client", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({
          source: "Twitter Web App",
          createdAt: "2020-01-01T00:00:00.000Z",
        }),
        syntheticTweet({
          source: "Twitter Web App",
          createdAt: "2024-12-31T00:00:00.000Z",
        }),
        syntheticTweet({
          source: "Twitter Web App",
          createdAt: "2022-06-15T00:00:00.000Z",
        }),
      ],
    });
    const result = buildTweetClientJourney(archive);
    expect(result[0]?.firstSeen).toBe("2020-01-01T00:00:00.000Z");
    expect(result[0]?.lastSeen).toBe("2024-12-31T00:00:00.000Z");
  });

  it("treats missing source as 'Unknown'", () => {
    const archive = buildSyntheticArchive({
      tweets: [syntheticTweet({ source: "" })],
    });
    const result = buildTweetClientJourney(archive);
    expect(result[0]?.client).toBe("Unknown");
    expect(result[0]?.isThirdParty).toBe(true);
  });

  it("handles tweets with unparseable dates by leaving date fields null", () => {
    const archive = buildSyntheticArchive({
      tweets: [syntheticTweet({ source: "Buffer", createdAt: "garbage" })],
    });
    const result = buildTweetClientJourney(archive);
    expect(result[0]?.count).toBe(1);
    expect(result[0]?.firstSeen).toBeNull();
    expect(result[0]?.lastSeen).toBeNull();
  });
});
