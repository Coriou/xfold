import { describe, expect, it } from "vitest";
import {
  combineShareability,
  normalizeShareability,
} from "@/components/share-cards/auto-pick";
import type { ShareabilityScore } from "@/components/share-cards/types";

describe("normalizeShareability", () => {
  it("converts a plain number into a magnitude-only score with neutral axes", () => {
    expect(normalizeShareability(75)).toEqual({
      magnitude: 75,
      specificity: 50,
      uniqueness: 50,
    });
  });

  it("clamps numeric input below 0 and above 100", () => {
    expect(normalizeShareability(-10).magnitude).toBe(0);
    expect(normalizeShareability(999).magnitude).toBe(100);
  });

  it("treats NaN and Infinity as 0 (non-finite is invalid)", () => {
    expect(normalizeShareability(NaN).magnitude).toBe(0);
    expect(normalizeShareability(Infinity).magnitude).toBe(0);
    expect(normalizeShareability(-Infinity).magnitude).toBe(0);
  });

  it("passes a structured score through with clamping", () => {
    const input: ShareabilityScore = {
      magnitude: 200,
      specificity: -50,
      uniqueness: 80,
    };
    expect(normalizeShareability(input)).toEqual({
      magnitude: 100,
      specificity: 0,
      uniqueness: 80,
    });
  });
});

describe("combineShareability", () => {
  it("returns 0 for an all-zero score", () => {
    expect(
      combineShareability({ magnitude: 0, specificity: 0, uniqueness: 0 }),
    ).toBe(0);
  });

  it("returns 100 for an all-max score", () => {
    expect(
      combineShareability({
        magnitude: 100,
        specificity: 100,
        uniqueness: 100,
      }),
    ).toBe(100);
  });

  it("weights specificity more heavily than magnitude", () => {
    const allMagnitude = combineShareability({
      magnitude: 100,
      specificity: 0,
      uniqueness: 0,
    });
    const allSpecificity = combineShareability({
      magnitude: 0,
      specificity: 100,
      uniqueness: 0,
    });
    expect(allSpecificity).toBeGreaterThan(allMagnitude);
  });

  it("weights uniqueness more heavily than zero magnitude only", () => {
    const allUniqueness = combineShareability({
      magnitude: 0,
      specificity: 0,
      uniqueness: 100,
    });
    expect(allUniqueness).toBe(25);
  });

  it("rounds the blended result", () => {
    const result = combineShareability({
      magnitude: 33,
      specificity: 33,
      uniqueness: 33,
    });
    expect(Number.isInteger(result)).toBe(true);
  });

  it("a quote-driven card beats a magnitude-only card with the same headline number", () => {
    // A card with a real quoted string and high uniqueness:
    const quoted = combineShareability({
      magnitude: 60,
      specificity: 90,
      uniqueness: 85,
    });
    // A card with a big number but no specificity boost:
    const numberOnly = combineShareability({
      magnitude: 90,
      specificity: 50,
      uniqueness: 50,
    });
    expect(quoted).toBeGreaterThan(numberOnly);
  });
});
