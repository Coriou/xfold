// ---------------------------------------------------------------------------
// auto-pick — evaluate the registry and pick the most "shareable" card
// ---------------------------------------------------------------------------

import type {
  ComputeContext,
  EvaluatedShareCard,
  RegisteredShareCard,
  ShareCardId,
} from "./types";

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
