import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  computeScore,
  computeScoreShareability,
} from "@/components/share-cards/cards/score/compute";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  buildSyntheticArchive,
  syntheticAdImpression,
  syntheticAdImpressionBatch,
  syntheticConnectedApp,
  syntheticPersonalization,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";

const FIXED_NOW = new Date("2026-04-07T12:00:00.000Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("computeScore", () => {
  it("returns score card props for any archive (never null)", () => {
    const archive = buildSyntheticArchive();
    const score = computePrivacyScore(archive);
    const props = computeScore({ archive, score });
    expect(props).not.toBeNull();
    expect(props?.grade).toBe(score.grade);
    expect(props?.overall).toBe(score.overall);
  });

  it("counts unique advertisers across impressions and engagements", () => {
    const archive = buildSyntheticArchive({
      adImpressions: [
        syntheticAdImpressionBatch([
          syntheticAdImpression({ advertiserScreenName: "a" }),
          syntheticAdImpression({ advertiserScreenName: "b" }),
          syntheticAdImpression({ advertiserScreenName: "a" }),
        ]),
      ],
    });
    const score = computePrivacyScore(archive);
    const props = computeScore({ archive, score });
    expect(props?.advertisers).toBe(2);
  });

  it("counts personalization interests including disabled ones", () => {
    const archive = buildSyntheticArchive({
      personalization: syntheticPersonalization({
        interests: [
          { name: "tech", isDisabled: false },
          { name: "music", isDisabled: true },
        ],
      }),
    });
    const score = computePrivacyScore(archive);
    const props = computeScore({ archive, score });
    expect(props?.interests).toBe(2);
  });

  it("falls back to bullets when no quote is available", () => {
    const archive = buildSyntheticArchive({
      tweets: [syntheticTweet(), syntheticTweet()],
    });
    const score = computePrivacyScore(archive);
    const props = computeScore({ archive, score });
    expect(props?.quote).toBeNull();
    expect(props?.bullets.length).toBeGreaterThan(0);
    const hasTotals = props?.bullets.some((b) =>
      b.includes("data points stored"),
    );
    expect(hasTotals).toBe(true);
  });

  it("uses a quote when one is available and clears bullets", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          name: "Pearltrees Connect",
          permissions: ["read", "write"],
          approvedAt: "2012-09-25T07:35:16.000Z",
        }),
      ],
    });
    const score = computePrivacyScore(archive);
    const props = computeScore({ archive, score });
    expect(props?.quote).not.toBeNull();
    expect(props?.quote?.text).toBe("Pearltrees Connect");
    expect(props?.quote?.source).toBe("connected-app");
    expect(props?.bullets).toEqual([]);
  });

  it("propagates the quote severity", () => {
    const archive = buildSyntheticArchive({
      connectedApps: [
        syntheticConnectedApp({
          name: "X",
          permissions: ["write"],
          approvedAt: "2012-01-01T00:00:00.000Z",
        }),
      ],
    });
    const score = computePrivacyScore(archive);
    const props = computeScore({ archive, score });
    expect(props?.quote?.severity).toBe("high");
  });
});

describe("computeScoreShareability", () => {
  it("returns higher specificity when a quote is present", () => {
    const withQuote = computeScoreShareability({
      username: "u",
      overall: 50,
      grade: "C",
      headline: "",
      quote: {
        text: "x",
        source: "connected-app",
        date: null,
        contextLine: "",
        severity: "high",
      },
      receipts: [],
      bullets: [],
      tweets: 0,
      interests: 0,
      advertisers: 0,
    });
    const withoutQuote = computeScoreShareability({
      username: "u",
      overall: 50,
      grade: "C",
      headline: "",
      quote: null,
      receipts: [],
      bullets: [],
      tweets: 0,
      interests: 0,
      advertisers: 0,
    });
    expect(withQuote.specificity).toBeGreaterThan(withoutQuote.specificity);
  });

  it("magnitude tracks the privacy score and clamps to 0-100", () => {
    expect(
      computeScoreShareability({
        username: "u",
        overall: 999,
        grade: "F",
        headline: "",
        quote: null,
        receipts: [],
        bullets: [],
        tweets: 0,
        interests: 0,
        advertisers: 0,
      }).magnitude,
    ).toBe(100);

    expect(
      computeScoreShareability({
        username: "u",
        overall: -10,
        grade: "A",
        headline: "",
        quote: null,
        receipts: [],
        bullets: [],
        tweets: 0,
        interests: 0,
        advertisers: 0,
      }).magnitude,
    ).toBe(0);
  });
});
