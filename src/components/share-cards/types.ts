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
  | "first-and-last"
  | "advertiser-wall"
  | "off-twitter"
  | "identity-timeline"
  | "score"
  | "asked-grok"
  | "doors-open"
  | "dossier"
  | "deleted-tweets"
  | "ghost-data"
  | "contacts";

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
 * Three-axis shareability score. Cards that quote a real string from the
 * archive should pump `specificity`. Cards that report a one-in-a-million
 * stat should pump `uniqueness`. Cards that just report magnitude should
 * pump `magnitude`.
 *
 * Each axis is 0–100 independently. The combined score (used by the auto-
 * picker) is a weighted blend — see `combineShareability` in auto-pick.ts.
 */
export interface ShareabilityScore {
  /** "How big is the number?" — raw magnitude framing. */
  readonly magnitude: number;
  /** "How quotable is this?" — verbatim strings from the archive score high. */
  readonly specificity: number;
  /** "How rare is this in archives?" — Grok prompts and ancient apps score high. */
  readonly uniqueness: number;
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
 * - `shareabilityScore(props, ctx)` returns either a plain 0-100 number
 *   (legacy magnitude-only scoring) or a `ShareabilityScore` object. The
 *   number form gets normalized to `{ magnitude: n, specificity: 50, uniqueness: 50 }`.
 *   The auto-picker uses the combined score to choose the featured card.
 * - `Component` is the actual 1080×1080 React component.
 */
export interface ShareCardModule<TProps extends object> {
  readonly meta: ShareCardMetadata;
  readonly compute: (ctx: ComputeContext) => TProps | null;
  readonly shareabilityScore: (
    props: TProps,
    ctx: ComputeContext,
  ) => number | ShareabilityScore;
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
  /** 0-100, higher = more shareable. The blended score from `breakdown`. */
  readonly shareability: number;
  /** The three axes that fed into `shareability`. */
  readonly breakdown: ShareabilityScore;
  /** Renders the card at exactly 1080×1080. */
  readonly render: () => ReactElement;
}
