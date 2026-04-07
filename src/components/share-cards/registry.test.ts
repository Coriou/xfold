// ---------------------------------------------------------------------------
// Smoke tests for the share-card registry
// ---------------------------------------------------------------------------
//
// These tests catch the most common mistakes when adding a new card:
//   - forgetting to register it
//   - duplicate `id` or `slug` (would break filenames)
//   - the gallery never returning anything (regression in evaluateGallery)
// ---------------------------------------------------------------------------

import { describe, expect, it } from "vitest";
import { SHARE_CARDS } from "@/components/share-cards/registry";
import { evaluateGallery } from "@/components/share-cards/auto-pick";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  buildSyntheticArchive,
  syntheticAccount,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("SHARE_CARDS", () => {
  it("contains all 8 expected cards", () => {
    expect(SHARE_CARDS.length).toBe(8);
  });

  it("has unique ids", () => {
    const ids = SHARE_CARDS.map((c) => c.meta.id);
    expect(new Set(ids).size).toBe(SHARE_CARDS.length);
  });

  it("has unique download slugs", () => {
    const slugs = SHARE_CARDS.map((c) => c.meta.slug);
    expect(new Set(slugs).size).toBe(SHARE_CARDS.length);
  });

  it("every card has a non-empty title and tagline", () => {
    for (const c of SHARE_CARDS) {
      expect(c.meta.title.length).toBeGreaterThan(0);
      expect(c.meta.tagline.length).toBeGreaterThan(0);
    }
  });
});

describe("evaluateGallery", () => {
  it("returns at least the score card for an empty archive", () => {
    const archive = buildSyntheticArchive();
    const score = computePrivacyScore(archive);
    const result = evaluateGallery(SHARE_CARDS, { archive, score });
    expect(result.available.length).toBeGreaterThan(0);
    expect(result.featuredId).not.toBeNull();
    expect(result.available.some((c) => c.meta.id === "score")).toBe(true);
  });

  it("includes wrapped + first-and-last when there are 2+ tweets and an account", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({ createdAt: "2018-01-01T00:00:00.000Z" }),
      tweets: [
        syntheticTweet({ id: "1", createdAt: "2020-01-01T00:00:00.000Z" }),
        syntheticTweet({ id: "2", createdAt: "2024-01-01T00:00:00.000Z" }),
      ],
    });
    const score = computePrivacyScore(archive);
    const result = evaluateGallery(SHARE_CARDS, { archive, score });
    const ids = result.available.map((c) => c.meta.id);
    expect(ids).toContain("wrapped");
    expect(ids).toContain("first-and-last");
  });

  it("excludes off-twitter while parsers are stub (phase 5 will activate)", () => {
    const archive = buildSyntheticArchive();
    const score = computePrivacyScore(archive);
    const result = evaluateGallery(SHARE_CARDS, { archive, score });
    expect(result.available.some((c) => c.meta.id === "off-twitter")).toBe(
      false,
    );
  });
});
