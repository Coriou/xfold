import { describe, expect, it } from "vitest";
import { buildTextCorpus } from "@/lib/archive/insights/tokenizer";

describe("buildTextCorpus", () => {
  it("returns empty corpus for an empty input", () => {
    const c = buildTextCorpus([]);
    expect(c.normalized).toEqual([]);
    expect(c.tokens.size).toBe(0);
    expect(c.contains("anything")).toBe(false);
    expect(c.count("anything")).toBe(0);
  });

  it("ignores empty/whitespace-only strings", () => {
    const c = buildTextCorpus(["", "   ", "\n\t"]);
    expect(c.normalized).toEqual([]);
    expect(c.tokens.size).toBe(0);
  });

  it("lowercases everything", () => {
    const c = buildTextCorpus(["Hello WORLD"]);
    expect(c.normalized).toEqual(["hello world"]);
    expect(c.tokens.has("hello")).toBe(true);
    expect(c.tokens.has("world")).toBe(true);
  });

  it("strips http/https URLs", () => {
    const c = buildTextCorpus(["check this https://example.com/path?q=1 out"]);
    expect(c.normalized[0]).toBe("check this out");
    expect(c.tokens.has("https")).toBe(false);
  });

  it("strips t.co short links", () => {
    const c = buildTextCorpus(["nice t.co/abcDEF link"]);
    expect(c.normalized[0]).toBe("nice link");
  });

  it("strips @mentions", () => {
    const c = buildTextCorpus(["hello @someone how are you"]);
    expect(c.normalized[0]).toBe("hello how are you");
  });

  it("preserves hashtag word but drops the #", () => {
    const c = buildTextCorpus(["I love #JavaScript and #ai"]);
    expect(c.normalized[0]).toBe("i love javascript and ai");
    expect(c.tokens.has("javascript")).toBe(true);
    expect(c.tokens.has("ai")).toBe(true);
  });

  it("preserves $ tickers and digits", () => {
    const c = buildTextCorpus(["bullish on $AAPL and 5G"]);
    expect(c.normalized[0]).toContain("$aapl");
    expect(c.tokens.has("$aapl")).toBe(true);
    expect(c.tokens.has("5g")).toBe(true);
  });

  it("contains() matches multi-word substrings", () => {
    const c = buildTextCorpus(["I think Andrew Tate is overrated"]);
    expect(c.contains("Andrew Tate")).toBe(true);
    expect(c.contains("andrew tate")).toBe(true);
    expect(c.contains("not present")).toBe(false);
  });

  it("contains() returns false for empty needle", () => {
    const c = buildTextCorpus(["any text"]);
    expect(c.contains("")).toBe(false);
    expect(c.contains("   ")).toBe(false);
  });

  it("count() counts non-overlapping substring occurrences across all texts", () => {
    const c = buildTextCorpus([
      "ai is everywhere",
      "love AI tools",
      "old-school ai",
    ]);
    expect(c.count("ai")).toBe(3);
  });

  it("count() returns 0 for missing terms", () => {
    const c = buildTextCorpus(["unrelated text"]);
    expect(c.count("missing")).toBe(0);
    expect(c.count("")).toBe(0);
  });

  it("does not let one document's text bleed into another for substring search", () => {
    // Joined with a NUL-style separator so 'foobar' shouldn't match across docs.
    const c = buildTextCorpus(["foo", "bar"]);
    expect(c.contains("foo bar")).toBe(false);
    expect(c.contains("foo")).toBe(true);
    expect(c.contains("bar")).toBe(true);
  });

  it("strips punctuation but keeps word internals", () => {
    const c = buildTextCorpus(["hello, world! this-is great."]);
    expect(c.tokens.has("hello")).toBe(true);
    expect(c.tokens.has("world")).toBe(true);
    expect(c.tokens.has("this-is")).toBe(true);
    expect(c.tokens.has("great")).toBe(true);
  });
});
