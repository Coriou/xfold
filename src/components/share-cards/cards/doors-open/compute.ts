import { parseDate } from "@/lib/format";
import type { ComputeContext } from "../../types";

export interface DoorsOpenAppEntry {
  readonly name: string;
  readonly approvedAt: string;
  readonly yearsAgo: number;
  readonly hasWriteAccess: boolean;
  readonly hasDmAccess: boolean;
}

export interface DoorsOpenCardProps {
  readonly username: string;
  readonly totalApps: number;
  readonly writeAppCount: number;
  readonly oldestYearsAgo: number;
  readonly entries: readonly DoorsOpenAppEntry[];
}

const MIN_WRITE_APPS = 3;
const MIN_OLDEST_AGE_YEARS = 3;
const MAX_ENTRIES = 5;

function hasPermission(perms: readonly string[], needle: string): boolean {
  const lowered = needle.toLowerCase();
  return perms.some((p) => p.toLowerCase().includes(lowered));
}

export function computeDoorsOpen(
  ctx: ComputeContext,
): DoorsOpenCardProps | null {
  const apps = ctx.archive.connectedApps;
  if (apps.length === 0) return null;

  const writeApps = apps.filter((a) => hasPermission(a.permissions, "write"));

  // Resolve year-ago for each, skipping unparseable dates.
  interface Resolved {
    readonly entry: DoorsOpenAppEntry;
    readonly ts: number;
  }
  const now = Date.now();
  const resolved: Resolved[] = [];
  for (const app of writeApps) {
    const ts = parseDate(app.approvedAt)?.getTime();
    if (ts === undefined) continue;
    const yearsAgo = Math.floor((now - ts) / (1000 * 60 * 60 * 24 * 365.25));
    resolved.push({
      ts,
      entry: {
        name: app.name || app.id,
        approvedAt: app.approvedAt,
        yearsAgo,
        hasWriteAccess: hasPermission(app.permissions, "write"),
        hasDmAccess: hasPermission(app.permissions, "direct message"),
      },
    });
  }

  // Gate on resolved count so the headline number matches the listed entries.
  if (resolved.length < MIN_WRITE_APPS) return null;

  resolved.sort((a, b) => a.ts - b.ts);

  const oldest = resolved[0];
  if (!oldest || oldest.entry.yearsAgo < MIN_OLDEST_AGE_YEARS) return null;

  return {
    username: ctx.archive.meta.username,
    totalApps: apps.length,
    writeAppCount: resolved.length,
    oldestYearsAgo: oldest.entry.yearsAgo,
    entries: resolved.slice(0, MAX_ENTRIES).map((r) => r.entry),
  };
}

export function computeDoorsOpenShareability(props: DoorsOpenCardProps) {
  // The "still has write access from 2012" angle is highly specific and rare.
  return {
    magnitude: Math.min(100, 30 + props.writeAppCount * 6),
    specificity: 80,
    uniqueness: Math.min(100, 40 + props.oldestYearsAgo * 5),
  };
}
