// ---------------------------------------------------------------------------
// auto-pick — evaluate the registry and pick the most "shareable" card
// ---------------------------------------------------------------------------
//
// Shareability is a 3-axis score (magnitude × specificity × uniqueness).
// `combineShareability` blends them into the single 0–100 number that the
// auto-picker compares. The weights here are intentional product judgment:
// quoted strings should beat raw counts, and rare data should beat common.
// ---------------------------------------------------------------------------

import type {
  ComputeContext,
  EvaluatedShareCard,
  RegisteredShareCard,
  ShareCardId,
  ShareabilityScore,
} from "./types";

const DEFAULT_AXIS = 50;

const WEIGHT_MAGNITUDE = 0.25;
const WEIGHT_SPECIFICITY = 0.5;
const WEIGHT_UNIQUENESS = 0.25;

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

/**
 * Normalize a card's `shareabilityScore()` return into the 3-axis form.
 * Plain numbers (the legacy form) become magnitude-only, with the other
 * two axes set to a neutral mid value so they don't penalise the card.
 */
export function normalizeShareability(
  raw: number | ShareabilityScore,
): ShareabilityScore {
  if (typeof raw === "number") {
    return {
      magnitude: clamp(raw),
      specificity: DEFAULT_AXIS,
      uniqueness: DEFAULT_AXIS,
    };
  }
  return {
    magnitude: clamp(raw.magnitude),
    specificity: clamp(raw.specificity),
    uniqueness: clamp(raw.uniqueness),
  };
}

/** Blend the 3 axes into a single 0–100 shareability number. */
export function combineShareability(score: ShareabilityScore): number {
  const blended =
    score.magnitude * WEIGHT_MAGNITUDE +
    score.specificity * WEIGHT_SPECIFICITY +
    score.uniqueness * WEIGHT_UNIQUENESS;
  return Math.round(clamp(blended));
}

export interface GalleryItems {
  readonly available: readonly EvaluatedShareCard[];
  readonly featuredId: ShareCardId | null;
}

export function evaluateGallery(
  cards: readonly RegisteredShareCard[],
  ctx: ComputeContext,
): GalleryItems {
  const available: EvaluatedShareCard[] = [];
  for (const card of cards) {
    const evaluated = card.evaluate(ctx);
    if (evaluated !== null) available.push(evaluated);
  }

  let featured: EvaluatedShareCard | null = null;
  for (const card of available) {
    if (featured === null || card.shareability > featured.shareability) {
      featured = card;
    }
  }

  return {
    available,
    featuredId: featured?.meta.id ?? null,
  };
}
