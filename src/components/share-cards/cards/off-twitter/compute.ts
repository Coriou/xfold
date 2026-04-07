// ---------------------------------------------------------------------------
// Off-Twitter card — pulls from archive.offTwitter
// ---------------------------------------------------------------------------

import type { ComputeContext } from "../../types";

export interface OffTwitterCardProps {
  readonly username: string;
  readonly apps: number;
  readonly sites: number;
  readonly installs: number;
}

export function computeOffTwitter(
  ctx: ComputeContext,
): OffTwitterCardProps | null {
  const ot = ctx.archive.offTwitter;
  const apps = ot.inferredApps.length;
  const sites =
    ot.onlineConversionsAttributed.length +
    ot.onlineConversionsUnattributed.length;
  const installs =
    ot.mobileConversionsAttributed.length +
    ot.mobileConversionsUnattributed.length;

  if (apps + sites + installs === 0) return null;

  return {
    username: ctx.archive.meta.username,
    apps,
    sites,
    installs,
  };
}

export function computeOffTwitterShareability(
  props: OffTwitterCardProps,
): number {
  return Math.round(
    Math.min(100, ((props.apps + props.sites + props.installs) / 200) * 100),
  );
}
