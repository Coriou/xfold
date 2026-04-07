import { describe, expect, it } from "vitest";
import {
  computeFirstAndLast,
  computeFirstAndLastShareability,
} from "@/components/share-cards/cards/first-and-last/compute";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  buildSyntheticArchive,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("computeFirstAndLast", () => {
  it("returns null when there are no tweets", () => {
    const archive = buildSyntheticArchive();
    const score = computePrivacyScore(archive);
    expect(computeFirstAndLast({ archive, score })).toBeNull();
  });

  it("returns null when there is only one tweet", () => {
    const archive = buildSyntheticArchive({
      tweets: [syntheticTweet()],
    });
    const score = computePrivacyScore(archive);
    expect(computeFirstAndLast({ archive, score })).toBeNull();
  });

  it("returns first and last with days between", () => {
    const archive = buildSyntheticArchive({
      tweets: [
        syntheticTweet({
          id: "1",
          fullText: "the very first",
          createdAt: "2020-01-01T00:00:00.000Z",
        }),
        syntheticTweet({
          id: "2",
          fullText: "the latest",
          createdAt: "2020-01-11T00:00:00.000Z",
        }),
      ],
    });
    const score = computePrivacyScore(archive);
    const props = computeFirstAndLast({ archive, score });
    expect(props?.firstText).toContain("first");
    expect(props?.lastText).toContain("latest");
    expect(props?.daysBetween).toBe(10);
  });
});

describe("computeFirstAndLastShareability", () => {
  it("rewards long timelines", () => {
    const young = computeFirstAndLastShareability({
      username: "u",
      firstText: "",
      firstDate: "",
      lastText: "",
      lastDate: "",
      daysBetween: 365,
    });
    const old = computeFirstAndLastShareability({
      username: "u",
      firstText: "",
      firstDate: "",
      lastText: "",
      lastDate: "",
      daysBetween: 3650,
    });
    expect(old).toBeGreaterThan(young);
    expect(old).toBe(100);
  });
});
