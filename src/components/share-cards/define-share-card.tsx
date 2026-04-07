// ---------------------------------------------------------------------------
// defineShareCard — wraps a typed ShareCardModule into a registry entry
// ---------------------------------------------------------------------------
//
// This is the only place where the per-card generic TProps is "erased" —
// the returned RegisteredShareCard exposes a uniform `evaluate(ctx)` thunk
// that closes over the concrete TProps internally. No `any`, no central
// discriminated union, no per-card switch on `id` for consumers.
// ---------------------------------------------------------------------------

import { combineShareability, normalizeShareability } from "./auto-pick";
import type { RegisteredShareCard, ShareCardModule } from "./types";

export function defineShareCard<TProps extends object>(
  module: ShareCardModule<TProps>,
): RegisteredShareCard {
  const { meta, compute, shareabilityScore, Component } = module;
  return {
    meta,
    evaluate(ctx) {
      const props = compute(ctx);
      if (props === null) return null;
      const breakdown = normalizeShareability(shareabilityScore(props, ctx));
      return {
        meta,
        shareability: combineShareability(breakdown),
        breakdown,
        render: () => <Component {...props} />,
      };
    },
  };
}
