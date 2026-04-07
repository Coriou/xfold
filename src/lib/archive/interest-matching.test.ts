import { describe, expect, it } from "vitest";
import {
  buildCorpus,
  isInterestConfirmed,
  matchInterests,
  tokenizeInterest,
} from "@/lib/archive/interest-matching";

describe("buildCorpus", () => {
  it("returns an empty context for no input", () => {
    const ctx = buildCorpus([]);
    expect(ctx.text).toBe("");
    expect(ctx.words.size).toBe(0);
  });

  it("ignores nulls and undefineds", () => {
    const ctx = buildCorpus([null, undefined, "Machine learning rocks"]);
    expect(ctx.text).toContain("machine learning rocks");
    expect(ctx.words.has("machine")).toBe(true);
    expect(ctx.words.has("learning")).toBe(true);
    expect(ctx.words.has("rocks")).toBe(true);
  });

  it("only stores words at least 4 characters long", () => {
    const ctx = buildCorpus(["AI is fun and cool"]);
    expect(ctx.words.has("ai")).toBe(false);
    expect(ctx.words.has("is")).toBe(false);
    expect(ctx.words.has("fun")).toBe(false);
    expect(ctx.words.has("and")).toBe(false);
    expect(ctx.words.has("cool")).toBe(true);
  });

  it("lowercases everything", () => {
    const ctx = buildCorpus(["MACHINE Learning"]);
    expect(ctx.words.has("machine")).toBe(true);
    expect(ctx.words.has("learning")).toBe(true);
    expect(ctx.words.has("MACHINE")).toBe(false);
  });
});

describe("tokenizeInterest", () => {
  it("splits a multi-word name into tokens", () => {
    expect(tokenizeInterest("Machine Learning")).toEqual([
      "machine",
      "learning",
    ]);
  });

  it("filters tokens shorter than 4 characters", () => {
    expect(tokenizeInterest("AI tech")).toEqual(["tech"]);
  });

  it("returns an empty array for tokenless input", () => {
    expect(tokenizeInterest("AI")).toEqual([]);
  });

  it("handles slash and ampersand separators", () => {
    expect(tokenizeInterest("Movies & TV/Film")).toEqual([
      "movies",
      "film",
    ]);
  });
});

describe("isInterestConfirmed", () => {
  it("does NOT confirm a multi-word interest from a single unrelated word", () => {
    // The classic regression: "Machine Learning" being confirmed by
    // a tweet saying "machine politics".
    const corpus = buildCorpus([
      "I hate machine politics in this country",
    ]);
    expect(isInterestConfirmed("Machine Learning", corpus)).toBe(false);
  });

  it("confirms by phrase match when the full phrase appears", () => {
    const corpus = buildCorpus([
      "I love studying machine learning every day",
    ]);
    expect(isInterestConfirmed("Machine Learning", corpus)).toBe(true);
  });

  it("confirms by all-tokens match when every token appears separately", () => {
    const corpus = buildCorpus([
      "I love machine vision",
      "deep learning is fascinating",
    ]);
    // Phrase isn't contiguous, but both tokens are in the corpus
    expect(isInterestConfirmed("Machine Learning", corpus)).toBe(true);
  });

  it("does NOT confirm when one token is missing", () => {
    const corpus = buildCorpus(["I love machine vision research"]);
    expect(isInterestConfirmed("Machine Learning", corpus)).toBe(false);
  });

  it("confirms a single-word interest by token presence", () => {
    const corpus = buildCorpus(["Photography is my hobby"]);
    expect(isInterestConfirmed("Photography", corpus)).toBe(true);
  });

  it("does NOT confirm a single-word interest absent from the corpus", () => {
    const corpus = buildCorpus(["I cook every day"]);
    expect(isInterestConfirmed("Photography", corpus)).toBe(false);
  });

  it("returns false for an empty interest name", () => {
    const corpus = buildCorpus(["anything"]);
    expect(isInterestConfirmed("", corpus)).toBe(false);
    expect(isInterestConfirmed("   ", corpus)).toBe(false);
  });

  it("does not confirm a too-short single token even by phrase", () => {
    // "AI" is below MIN_TOKEN_LENGTH so it has no tokens AND its phrase is
    // too short to qualify — both signals fail.
    const corpus = buildCorpus(["I love AI very much"]);
    expect(isInterestConfirmed("AI", corpus)).toBe(false);
  });

  it("is case-insensitive", () => {
    const corpus = buildCorpus(["MACHINE LEARNING is a field"]);
    expect(isInterestConfirmed("machine learning", corpus)).toBe(true);
  });
});

describe("matchInterests", () => {
  it("uses the rigorous matcher and surfaces ad targeting counts", () => {
    const tweetCorpus = buildCorpus(["I love machine learning"]);
    const likeCorpus = buildCorpus([]);
    const adCounts = new Map<string, number>([["photography", 12]]);

    const matches = matchInterests(
      [
        { name: "Machine Learning", isDisabled: false },
        { name: "Photography", isDisabled: false },
        { name: "Quantum Mechanics", isDisabled: true },
      ],
      tweetCorpus,
      likeCorpus,
      adCounts,
    );

    expect(matches[0]?.confirmed).toBe(true);
    expect(matches[0]?.usedByAdvertisers).toBe(false);

    expect(matches[1]?.confirmed).toBe(false);
    expect(matches[1]?.usedByAdvertisers).toBe(true);
    expect(matches[1]?.adImpressionCount).toBe(12);

    expect(matches[2]?.confirmed).toBe(false);
    expect(matches[2]?.isDisabled).toBe(true);
  });
});
