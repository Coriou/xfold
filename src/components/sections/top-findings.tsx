"use client";

// ---------------------------------------------------------------------------
// Top Findings — the "holy shit" landing experience
// ---------------------------------------------------------------------------
// Instead of dumping users into 28 sections, this surfaces the most
// surprising cross-data findings ranked by shock value. Each finding
// cross-references multiple data domains (deletions × ad targeting,
// disabled interests × ad impressions, etc.).
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { computePrivacyScore } from "@/lib/privacy-score";
import {
  computeTopFindings,
  type TopFinding,
  type FindingSeverity,
} from "@/lib/archive/insights/top-findings";
import { SectionHeader } from "@/components/shared/section-header";
import { ScoreRing } from "@/components/shared/score-ring";
import { ShareGallery } from "@/components/share-cards/share-gallery";

// --- Severity styles --------------------------------------------------------

const SEVERITY_BG: Record<FindingSeverity, string> = {
  critical: "border-danger/40 bg-danger/5",
  high: "border-danger/20 bg-danger/[0.03]",
  medium: "border-accent/20 bg-accent/[0.03]",
  info: "border-border bg-background-raised",
};

const SEVERITY_DOT: Record<FindingSeverity, string> = {
  critical: "bg-danger",
  high: "bg-danger/70",
  medium: "bg-accent",
  info: "bg-foreground-muted",
};

const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  critical: "text-danger",
  high: "text-danger/80",
  medium: "text-accent",
  info: "text-foreground-muted",
};

// --- Component --------------------------------------------------------------

interface TopFindingsProps {
  archive: ParsedArchive;
  onNavigate?: ((sectionId: string) => void) | undefined;
}

export default function TopFindings({ archive, onNavigate }: TopFindingsProps) {
  const score = useMemo(() => computePrivacyScore(archive), [archive]);
  const findings = useMemo(() => computeTopFindings(archive), [archive]);
  const [cardOpen, setCardOpen] = useState(false);

  // Show top 8 findings max on the landing view
  const topFindings = findings.slice(0, 8);
  const criticalCount = findings.filter(
    (f) => f.severity === "critical",
  ).length;
  const highCount = findings.filter((f) => f.severity === "high").length;

  return (
    <div>
      <SectionHeader
        title="What X Doesn't Want You to See"
        description="Cross-referenced findings from your archive — things X's own viewer hides or downplays."
        badge={`${findings.length} findings`}
      />

      {/* Compact score hero */}
      <div className="mb-6 flex flex-col items-center gap-5 rounded-xl border border-border bg-background-raised p-5 sm:flex-row sm:items-start">
        <ScoreRing score={score.overall} grade={score.grade} size={120} />
        <div className="flex flex-1 flex-col items-center gap-2 sm:items-start">
          <p className="text-lg font-medium text-foreground">
            {score.headline}
          </p>
          <p className="text-sm text-foreground-muted">{score.analogy}</p>
          <div className="mt-1 flex flex-wrap gap-3">
            {criticalCount > 0 && (
              <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-semibold text-danger">
                {criticalCount} critical
              </span>
            )}
            {highCount > 0 && (
              <span className="rounded-full bg-danger/5 px-2.5 py-0.5 text-xs font-semibold text-danger/70">
                {highCount} high severity
              </span>
            )}
            <button
              onClick={() => setCardOpen(true)}
              className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              Share your card →
            </button>
          </div>
        </div>
      </div>

      {/* Findings list */}
      {topFindings.length > 0 ? (
        <div className="space-y-3">
          {topFindings.map((finding, index) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              rank={index + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background-raised p-8 text-center">
          <p className="text-sm text-foreground-muted">
            No significant cross-data findings detected.
          </p>
        </div>
      )}

      {/* Explore prompt */}
      {findings.length > 8 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-foreground-muted">
            {findings.length - 8} more findings available — explore the sidebar
            sections for details.
          </p>
        </div>
      )}

      <ShareGallery
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        archive={archive}
        score={score}
      />
    </div>
  );
}

// --- Finding card -----------------------------------------------------------

function FindingCard({
  finding,
  rank,
  onNavigate,
}: {
  finding: TopFinding;
  rank: number;
  onNavigate?: ((sectionId: string) => void) | undefined;
}) {
  const sectionId = finding.sectionId;

  return (
    <div className={`rounded-xl border p-4 ${SEVERITY_BG[finding.severity]}`}>
      <div className="flex items-start gap-3">
        {/* Rank + severity dot */}
        <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
          <span className="font-mono text-xs text-foreground-muted">
            #{rank}
          </span>
          <div
            className={`h-2.5 w-2.5 rounded-full ${SEVERITY_DOT[finding.severity]}`}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              {finding.hook}
            </p>
            <span
              className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider ${SEVERITY_LABEL[finding.severity]}`}
            >
              {finding.category}
            </span>
          </div>

          <p className="mt-1 text-sm text-foreground-muted">{finding.detail}</p>

          {/* Action row */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {sectionId && onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate(sectionId)}
                className="text-xs font-medium text-accent transition-colors hover:text-accent-hover"
              >
                See details →
              </button>
            )}
            {finding.action && (
              <a
                href={finding.action.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
              >
                {finding.action.label} ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
