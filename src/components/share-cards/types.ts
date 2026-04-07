// ---------------------------------------------------------------------------
// Share-card type contracts
// ---------------------------------------------------------------------------
//
// Pure type-only module — no JSX, no React imports. The JSX-emitting helper
// `defineShareCard()` lives in `define-share-card.tsx` because verbatimModuleSyntax
// + the .ts/.tsx split means JSX has to live in a .tsx file.
// ---------------------------------------------------------------------------

import type { ComponentType, ReactElement } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import type { PrivacyScore } from "@/lib/privacy-score";

/** Context passed to every card's compute() so we don't recompute the score. */
export interface ComputeContext {
  readonly archive: ParsedArchive;
  readonly score: PrivacyScore;
}

export type ShareCardId =
  | "receipt"
  | "wrapped"
  | "twitter-thinks"
  | "first-and-last"
  | "advertiser-wall"
  | "off-twitter"
  | "identity-timeline"
  | "score";

export type ShareCardCategory =
  | "headline"
  | "identity"
  | "ads"
  | "history"
  | "score";

export interface ShareCardMetadata {
  readonly id: ShareCardId;
  readonly title: string;
  readonly tagline: string;
  readonly category: ShareCardCategory;
  /** Slug appended to the download filename: `xfold-{username}-{slug}.png`. */
  readonly slug: string;
}

/**
 * Per-card module — generic over its own Props shape.
 *
 * `TProps extends object` so `<Component {...props} />` typechecks under
 * `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`. All cards pass an
 * object as props anyway.
 *
 * - `compute(ctx)` returns Props or null. Null means "this card is not
 *   available for this archive" (e.g. wrapped card with zero tweets).
 * - `shareabilityScore(props, ctx)` returns 0-100. Higher = more shareable.
 *   The auto-picker uses the highest score as the default featured card.
 * - `Component` is the actual 1080×1080 React component.
 */
export interface ShareCardModule<TProps extends object> {
  readonly meta: ShareCardMetadata;
  readonly compute: (ctx: ComputeContext) => TProps | null;
  readonly shareabilityScore: (props: TProps, ctx: ComputeContext) => number;
  readonly Component: ComponentType<TProps>;
}

/**
 * Type-erased registry entry. Each card module is generic, but the registry
 * stores a heterogeneous array. The `evaluate` thunk closes over the concrete
 * TProps internally so callers never have to know it.
 */
export interface RegisteredShareCard {
  readonly meta: ShareCardMetadata;
  readonly evaluate: (ctx: ComputeContext) => EvaluatedShareCard | null;
}

/** Result of evaluating one card against one archive. */
export interface EvaluatedShareCard {
  readonly meta: ShareCardMetadata;
  /** 0-100, higher = more shareable. */
  readonly shareability: number;
  /** Renders the card at exactly 1080×1080. */
  readonly render: () => ReactElement;
}
