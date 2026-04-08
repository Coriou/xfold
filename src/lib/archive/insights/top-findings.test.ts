import { describe, expect, it } from "vitest";
import {
  buildSyntheticArchive,
  syntheticDeletedTweet,
  syntheticInterest,
  syntheticPersonalization,
  syntheticUploadedContact,
} from "@/lib/archive/__fixtures/synthetic-archive";
import { computeTopFindings } from "./top-findings";

describe("computeTopFindings", () => {
  it("returns no findings for an empty archive", () => {
    const result = computeTopFindings(buildSyntheticArchive());
    expect(result).toEqual([]);
  });

  it("surfaces deletion-lie when there are 5+ deleted tweets", () => {
    const archive = buildSyntheticArchive({
      deletedTweets: Array.from({ length: 6 }, (_, i) =>
        syntheticDeletedTweet({ id: `d${i}` }),
      ),
    });
    const result = computeTopFindings(archive);
    expect(result.some((f) => f.id === "deletion-lie")).toBe(true);
  });

  it("surfaces contact-spillage when 10+ contacts uploaded", () => {
    const archive = buildSyntheticArchive({
      contacts: Array.from({ length: 12 }, (_, i) =>
        syntheticUploadedContact({ id: `c${i}` }),
      ),
    });
    const result = computeTopFindings(archive);
    expect(result.some((f) => f.id === "contact-spillage")).toBe(true);
  });

  it("surfaces zombie-interests when at least 5 interests are disabled", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        interests: [
          syntheticInterest({ name: "Politics", isDisabled: true }),
          syntheticInterest({ name: "Sports", isDisabled: true }),
          syntheticInterest({ name: "Music", isDisabled: true }),
          syntheticInterest({ name: "Tech", isDisabled: true }),
          syntheticInterest({ name: "Food", isDisabled: true }),
        ],
      }),
    });
    const result = computeTopFindings(archive);
    expect(result.some((f) => f.id === "zombie-interests")).toBe(true);
  });

  it("sorts findings by shockScore descending", () => {
    const archive = buildSyntheticArchive({
      deletedTweets: Array.from({ length: 200 }, (_, i) =>
        syntheticDeletedTweet({ id: `d${i}` }),
      ),
      contacts: Array.from({ length: 25 }, (_, i) =>
        syntheticUploadedContact({ id: `c${i}` }),
      ),
    });
    const result = computeTopFindings(archive);
    expect(result.length).toBeGreaterThan(1);
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1];
      const curr = result[i];
      if (!prev || !curr) continue;
      expect(prev.shockScore).toBeGreaterThanOrEqual(curr.shockScore);
    }
  });
});
