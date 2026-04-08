import { describe, expect, it } from "vitest";
import {
  buildSyntheticArchive,
  syntheticDeletedTweet,
  syntheticInterest,
  syntheticPersonalization,
} from "@/lib/archive/__fixtures/synthetic-archive";
import { buildDeletionLie } from "./deletion-lie";

describe("buildDeletionLie", () => {
  it("returns null when there are no deleted tweets", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        interests: [syntheticInterest({ name: "Technology" })],
      }),
    });
    expect(buildDeletionLie(archive)).toBeNull();
  });

  it("returns null when there is no personalization data", () => {
    const archive = buildSyntheticArchive({
      deletedTweets: [
        syntheticDeletedTweet({ fullText: "thoughts on technology" }),
      ],
    });
    expect(buildDeletionLie(archive)).toBeNull();
  });

  it("returns null when interests are empty", () => {
    const archive = buildSyntheticArchive({
      deletedTweets: [
        syntheticDeletedTweet({ fullText: "thoughts on technology" }),
      ],
      personalization: syntheticPersonalization({ interests: [] }),
    });
    expect(buildDeletionLie(archive)).toBeNull();
  });

  it("surfaces a topic that survived deletion", () => {
    const archive = buildSyntheticArchive({
      deletedTweets: [
        syntheticDeletedTweet({
          id: "d1",
          fullText: "loving technology and gadgets",
        }),
        syntheticDeletedTweet({
          id: "d2",
          fullText: "more thoughts on technology",
        }),
      ],
      personalization: syntheticPersonalization({
        interests: [syntheticInterest({ name: "Technology" })],
      }),
    });
    const result = buildDeletionLie(archive);
    expect(result).not.toBeNull();
    expect(result?.survivingTopicCount).toBe(1);
    expect(result?.entries[0]?.interestName).toBe("Technology");
    expect(result?.entries[0]?.deletedMentions).toBeGreaterThan(0);
    expect(result?.totalDeleted).toBe(2);
    expect(result?.worstCase?.interestName).toBe("Technology");
  });

  it("flags fully-erased topics that X still profiles", () => {
    const archive = buildSyntheticArchive({
      // Deleted tweet mentions Technology, no active tweet mentions it
      deletedTweets: [
        syntheticDeletedTweet({
          fullText: "speculating about technology trends",
        }),
      ],
      personalization: syntheticPersonalization({
        interests: [syntheticInterest({ name: "Technology" })],
      }),
    });
    const result = buildDeletionLie(archive);
    expect(result?.fullyErasedButProfiled).toBe(1);
  });
});
