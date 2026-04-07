import type { ComputeContext } from "../../types";

export interface IdentityTimelineCardProps {
  readonly username: string;
  /** All known handles, oldest first. The first item is the original handle. */
  readonly handles: readonly { handle: string; sinceDate: string | null }[];
}

export function computeIdentityTimeline(
  ctx: ComputeContext,
): IdentityTimelineCardProps | null {
  const changes = ctx.archive.screenNameChanges;
  if (changes.length === 0) return null;

  const sorted = [...changes].sort((a, b) =>
    a.changedAt.localeCompare(b.changedAt),
  );

  const handles: { handle: string; sinceDate: string | null }[] = [];
  // The "from" of the first change is the original handle (no known date).
  const firstChange = sorted[0];
  if (firstChange) {
    handles.push({ handle: firstChange.changedFrom, sinceDate: null });
  }
  for (const c of sorted) {
    handles.push({ handle: c.changedTo, sinceDate: c.changedAt });
  }

  return {
    username: ctx.archive.meta.username,
    handles,
  };
}

export function computeIdentityTimelineShareability(
  props: IdentityTimelineCardProps,
): number {
  // The more rebrands, the more shareable.
  // 4+ changes (5+ handles) caps the score.
  return Math.round(Math.min(100, ((props.handles.length - 1) / 4) * 100));
}
