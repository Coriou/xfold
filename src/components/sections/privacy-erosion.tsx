"use client";

import { useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import {
  buildErosionTimeline,
  type ErosionLayer,
} from "@/lib/archive/insights/erosion-timeline";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";

const CATEGORY_COLORS: Record<ErosionLayer["category"], string> = {
  content: "bg-accent",
  surveillance: "bg-danger",
  monetization: "bg-chart-monetization",
  ai: "bg-chart-ai",
  "third-party": "bg-chart-third-party",
};

const CATEGORY_TEXT: Record<ErosionLayer["category"], string> = {
  content: "text-accent",
  surveillance: "text-danger",
  monetization: "text-chart-monetization",
  ai: "text-chart-ai",
  "third-party": "text-chart-third-party",
};

const CATEGORY_LABELS: Record<ErosionLayer["category"], string> = {
  content: "Content",
  surveillance: "Surveillance",
  monetization: "Monetization",
  ai: "AI",
  "third-party": "Third-party",
};

export default function PrivacyErosion({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const timeline = useMemo(() => buildErosionTimeline(archive), [archive]);

  if (!timeline) {
    return (
      <div>
        <SectionHeader
          title="Privacy Erosion"
          description="How X's surveillance expanded over time."
        />
        <EmptyState title="Not enough temporal data available" />
      </div>
    );
  }

  // Find the max layer count for bar scaling
  const maxActive = Math.max(
    ...timeline.milestones.map((m) => m.activeLayers),
    1,
  );

  return (
    <div>
      <SectionHeader
        title="Privacy Erosion"
        description={`How X's data collection expanded over ${timeline.spanYears} years.`}
        badge={`${timeline.totalCategories} categories`}
      />

      {/* Hero */}
      <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-5">
        <p className="text-lg font-semibold text-danger">
          X went from tracking {timeline.milestones[0]?.activeLayers ?? 0} data
          categories to {timeline.totalCategories} — across {timeline.spanYears}{" "}
          years.
        </p>
        <p className="mt-1 text-sm text-foreground-muted">
          Each new layer represents a new way X monitors, profiles, or monetizes
          your activity.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Data categories"
          value={timeline.totalCategories}
          variant="danger"
        />
        <StatCard label="Years of data" value={timeline.spanYears} />
        <StatCard
          label="Total data points"
          value={timeline.layers.reduce((s, l) => s + l.count, 0)}
        />
        <StatCard
          label="Surveillance layers"
          value={
            timeline.layers.filter((l) => l.category === "surveillance").length
          }
          variant="danger"
        />
      </div>

      {/* Stacked bar year-by-year */}
      <div className="mb-6 rounded-xl border border-border bg-background-raised p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
          Surveillance Expansion by Year
        </h3>
        <div className="space-y-2">
          {timeline.milestones.map((milestone) => {
            const widthPct = (milestone.activeLayers / maxActive) * 100;
            return (
              <div key={milestone.year} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-right font-mono text-xs text-foreground-muted">
                  {milestone.year}
                </span>
                <div className="relative h-6 flex-1 overflow-hidden rounded bg-foreground/5">
                  <div
                    className="h-full rounded bg-danger/60 transition-all"
                    style={{ width: `${Math.max(widthPct, 3)}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right font-mono text-xs text-foreground-muted">
                  {milestone.activeLayers}
                </span>
                {milestone.newLayers.length > 0 && (
                  <span className="hidden w-48 shrink-0 truncate text-right text-[10px] text-foreground-muted lg:block">
                    +{milestone.newLayers.join(", ")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Data collection layers detail */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
          Data Collection Layers
        </h3>

        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-3">
          {(Object.keys(CATEGORY_LABELS) as ErosionLayer["category"][]).map(
            (cat) => (
              <div key={cat} className="flex items-center gap-1.5">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${CATEGORY_COLORS[cat]}`}
                />
                <span className="text-xs text-foreground-muted">
                  {CATEGORY_LABELS[cat]}
                </span>
              </div>
            ),
          )}
        </div>

        <div className="space-y-3">
          {timeline.layers.map((layer) => (
            <div
              key={layer.label}
              className="rounded-xl border border-border bg-background-raised p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 shrink-0 rounded-full ${CATEGORY_COLORS[layer.category]}`}
                  />
                  <h4 className="text-sm font-semibold text-foreground">
                    {layer.label}
                  </h4>
                </div>
                <span
                  className={`text-xs font-medium ${CATEGORY_TEXT[layer.category]}`}
                >
                  {layer.count.toLocaleString()} records
                </span>
              </div>
              <p className="mt-1 pl-5 text-xs text-foreground-muted">
                {layer.description}
              </p>
              <p className="mt-1 pl-5 text-[10px] text-foreground-muted/70">
                First seen: {formatDate(layer.firstSeen)} — Last:{" "}
                {formatDate(layer.lastSeen)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
