"use client";

import { useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { buildXVsReality } from "@/lib/archive/insights/x-vs-reality";

interface XVsRealityProps {
  archive: ParsedArchive;
  onNavigate?: ((sectionId: string) => void) | undefined;
}

const SEVERITY_STYLES = {
  critical: "border-danger/40 bg-danger/5",
  warning: "border-accent/40 bg-accent/5",
  info: "border-border bg-background-raised",
} as const;

const SEVERITY_LABEL = {
  critical: "Critical gap",
  warning: "Hidden detail",
  info: "Discrepancy",
} as const;

export default function XVsReality({ archive, onNavigate }: XVsRealityProps) {
  const data = useMemo(() => buildXVsReality(archive), [archive]);

  if (!data) {
    return (
      <div>
        <SectionHeader
          title="X's Version vs. Reality"
          description="Side-by-side comparison of what X's viewer shows vs. what's actually stored."
        />
        <EmptyState
          title="Not enough data"
          description="Your archive doesn't contain enough data categories for a meaningful comparison."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="X's Version vs. Reality"
        description="What X's built-in archive viewer shows you vs. what's actually in your data."
        badge={`${data.totalRows} discrepancies`}
      />

      {/* Hero callout */}
      <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-5">
        <p className="text-lg font-bold text-danger">{data.headline}</p>
        <p className="mt-2 text-sm text-foreground-muted">
          When you download your archive, X provides an HTML viewer. Here&apos;s
          what it doesn&apos;t tell you — and what xfold found by
          cross-referencing your data.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Critical gaps"
          value={data.criticalCount}
          variant={data.criticalCount > 0 ? "danger" : "default"}
        />
        <StatCard label="Data categories compared" value={data.totalRows} />
        <StatCard
          label="Hidden from viewer"
          value={
            data.rows.filter(
              (r) =>
                r.xVersion.toLowerCase().includes("not shown") ||
                r.xVersion.includes("not in") ||
                r.xVersion.includes("Not shown"),
            ).length
          }
          variant="danger"
          subtitle="Completely absent from X's viewer"
        />
      </div>

      {/* Comparison rows */}
      <div className="space-y-4">
        {data.rows.map((row) => (
          <button
            key={row.category}
            type="button"
            disabled={!onNavigate}
            onClick={() => onNavigate?.(row.sectionId)}
            className={`w-full rounded-xl border p-5 text-left transition-colors ${SEVERITY_STYLES[row.severity]} ${
              onNavigate
                ? "cursor-pointer hover:border-foreground/30"
                : "cursor-default"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                {row.category}
              </h3>
              <div className="flex items-center gap-2">
                {row.multiplier && (
                  <span className="rounded-full bg-danger/20 px-2 py-0.5 font-mono text-xs font-bold text-danger">
                    {row.multiplier}
                  </span>
                )}
                <span className="text-xs text-foreground-muted">
                  {SEVERITY_LABEL[row.severity]}
                </span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {/* X's version */}
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  What X shows you
                </div>
                <p className="text-sm text-foreground-muted">{row.xVersion}</p>
              </div>

              {/* Reality */}
              <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-danger">
                  What&apos;s really there
                </div>
                <p className="text-sm text-foreground">{row.reality}</p>
              </div>
            </div>

            {onNavigate && (
              <span className="mt-3 inline-block text-xs font-medium text-accent">
                Explore this data →
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
