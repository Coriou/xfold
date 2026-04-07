"use client";

// ---------------------------------------------------------------------------
// "If You Left Today" — Data Fate Calculator
// ---------------------------------------------------------------------------
// Shows users exactly what would happen to each category of their data if
// they deleted their X account right now. Shatters the illusion that
// "delete" means gone.
// ---------------------------------------------------------------------------

import { useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  computeDataFate,
  type DataFateEntry,
  type FateVerdict,
} from "@/lib/archive/insights/data-fate";

interface DataFateProps {
  archive: ParsedArchive;
  onNavigate?: ((sectionId: string) => void) | undefined;
}

// --- Verdict styling --------------------------------------------------------

const VERDICT_STYLES: Record<FateVerdict, string> = {
  shared: "border-danger/40 bg-danger/5",
  retained: "border-danger/20 bg-danger/[0.03]",
  maybe: "border-accent/20 bg-accent/[0.03]",
  deleted: "border-border bg-background-raised",
};

const VERDICT_BADGE_STYLES: Record<FateVerdict, string> = {
  shared: "bg-danger/15 text-danger",
  retained: "bg-danger/10 text-danger/80",
  maybe: "bg-accent/10 text-accent",
  deleted: "bg-foreground-muted/10 text-foreground-muted",
};

const VERDICT_LABELS: Record<FateVerdict, string> = {
  shared: "Already shared — can't be recalled",
  retained: "Retained by X",
  maybe: "Partially removed",
  deleted: "Deleted",
};

const VERDICT_SHORT: Record<FateVerdict, string> = {
  shared: "Shared",
  retained: "Retained",
  maybe: "Uncertain",
  deleted: "Deleted",
};

// --- Component --------------------------------------------------------------

export default function DataFate({ archive }: DataFateProps) {
  const result = useMemo(() => computeDataFate(archive), [archive]);

  if (result.entries.length === 0) {
    return (
      <div>
        <SectionHeader
          title="If You Left Today"
          description="What happens to your data if you delete your account."
        />
        <EmptyState
          title="Not enough data to analyze"
          description="Upload a more complete archive to see data fate predictions."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="If You Left Today"
        description="What would actually happen to each category of your data if you deleted your X account right now."
        badge={`${result.entries.length} categories`}
      />

      {/* Hero callout */}
      <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-5">
        <p className="text-lg font-bold text-danger">{result.summary}</p>
        <p className="mt-2 text-sm text-foreground-muted">
          X&apos;s privacy policy allows retention for &quot;legal, safety,
          security, and business purposes&quot; — a catch-all that covers almost
          everything. Data shared with third-party advertisers and data brokers
          is already beyond your reach.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Retained / shared"
          value={result.retainedCount}
          variant="danger"
        />
        <StatCard
          label="Uncertain"
          value={result.maybeCount}
          variant={result.maybeCount > 0 ? "accent" : "default"}
        />
        <StatCard
          label="Actually deleted"
          value={result.deletedCount}
          variant="default"
        />
        <StatCard
          label="Total data points"
          value={result.totalDataPoints.toLocaleString()}
          variant="default"
        />
      </div>

      {/* Fate list */}
      <div className="space-y-3">
        {result.entries.map((entry) => (
          <FateCard key={entry.label} entry={entry} />
        ))}
      </div>

      {/* Bottom note */}
      <div className="mt-6 rounded-xl border border-border bg-background-raised p-4">
        <p className="text-xs text-foreground-muted leading-relaxed">
          <span className="font-semibold text-foreground">Note:</span> Fate
          verdicts are based on X&apos;s published privacy policy, terms of
          service, and known data practices as of early 2025. Actual retention
          may vary. Under GDPR and CCPA, you can submit formal deletion requests
          — but enforcement depends on your jurisdiction.
        </p>
      </div>
    </div>
  );
}

// --- Fate entry card --------------------------------------------------------

function FateCard({ entry }: { readonly entry: DataFateEntry }) {
  return (
    <div className={`rounded-xl border p-4 ${VERDICT_STYLES[entry.verdict]}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="shrink-0 pt-0.5 text-xl" role="img" aria-hidden>
          {entry.icon}
        </span>

        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {entry.label}
            </h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${VERDICT_BADGE_STYLES[entry.verdict]}`}
            >
              {VERDICT_SHORT[entry.verdict]}
            </span>
          </div>

          {/* Count */}
          <p className="mt-0.5 font-mono text-xs text-foreground-muted">
            {entry.count.toLocaleString()} {entry.unit}
          </p>

          {/* Verdict label */}
          <p className="mt-2 text-sm font-medium text-foreground">
            {VERDICT_LABELS[entry.verdict]}
          </p>

          {/* Explanation */}
          <p className="mt-1 text-sm text-foreground-muted leading-relaxed">
            {entry.explanation}
          </p>

          {/* Evidence */}
          {entry.evidence && (
            <div className="mt-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2">
              <p className="text-xs text-foreground-muted italic">
                {entry.evidence}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
