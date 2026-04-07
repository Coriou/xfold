"use client";

import { useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { detectGhostData } from "@/lib/archive/insights/ghost-data";

interface GhostDataProps {
  archive: ParsedArchive;
  onNavigate?: ((sectionId: string) => void) | undefined;
}

const SEVERITY_STYLES = {
  critical: "border-danger/40 bg-danger/5",
  warning: "border-accent/40 bg-accent/5",
  info: "border-border bg-background-raised",
} as const;

const SEVERITY_DOT = {
  critical: "bg-danger",
  warning: "bg-accent",
  info: "bg-foreground-muted",
} as const;

export default function GhostData({ archive, onNavigate }: GhostDataProps) {
  const categories = useMemo(() => detectGhostData(archive), [archive]);

  const criticalCount = categories.filter(
    (c) => c.severity === "critical",
  ).length;
  const warningCount = categories.filter(
    (c) => c.severity === "warning",
  ).length;

  if (categories.length === 0) {
    return (
      <div>
        <SectionHeader
          title="Ghost Data"
          description="Data X has on you but hides from their own archive viewer."
        />
        <EmptyState
          title="No hidden data detected"
          description="Your archive doesn't contain data categories that X typically hides."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Ghost Data"
        description="Data X has on you that their own archive viewer doesn't show."
        badge={`${categories.length} hidden categories`}
      />

      {/* Hero callout */}
      <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-5">
        <p className="text-lg font-bold text-danger">
          X hid {categories.length} categories of your data from their own
          viewer.
        </p>
        <p className="mt-2 text-sm text-foreground-muted">
          When you download your archive, X provides an HTML viewer to browse
          it. But these {categories.length} data categories are either missing
          from that viewer entirely, or buried so deep that most users never see
          them. xfold surfaces everything.
        </p>
      </div>

      {/* Stat summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Hidden categories"
          value={categories.length}
          variant="danger"
        />
        <StatCard
          label="Critical findings"
          value={criticalCount}
          variant={criticalCount > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Warnings"
          value={warningCount}
          variant={warningCount > 0 ? "accent" : "default"}
        />
      </div>

      {/* Category list */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            disabled={!cat.sectionId || !onNavigate}
            onClick={() => {
              if (cat.sectionId && onNavigate) onNavigate(cat.sectionId);
            }}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${SEVERITY_STYLES[cat.severity]} ${
              cat.sectionId && onNavigate
                ? "cursor-pointer hover:border-foreground/30"
                : "cursor-default"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${SEVERITY_DOT[cat.severity]}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {cat.label}
                  </h3>
                  <span className="shrink-0 font-mono text-xs text-foreground-muted">
                    {cat.count.toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground-muted">
                  {cat.description}
                </p>
                {cat.sectionId && onNavigate && (
                  <span className="mt-2 inline-block text-xs font-medium text-accent">
                    View details →
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
