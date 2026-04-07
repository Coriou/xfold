"use client";

// ---------------------------------------------------------------------------
// The Receipts — evidence-backed findings with specific proof
// ---------------------------------------------------------------------------
// Goes beyond "you have X deleted tweets" and shows the actual tweets,
// the actual interest names, the actual advertiser names. Proof, not stats.
// ---------------------------------------------------------------------------

import { useMemo, useState } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  buildEvidenceStack,
  type EvidenceFinding,
  type EvidenceItem,
} from "@/lib/archive/insights/evidence-stack";

interface TheReceiptsProps {
  archive: ParsedArchive;
  onNavigate?: ((sectionId: string) => void) | undefined;
}

// --- Severity styling -------------------------------------------------------

const SEVERITY_BORDER: Record<string, string> = {
  critical: "border-danger/40",
  high: "border-danger/20",
  medium: "border-accent/20",
};

const SEVERITY_BG: Record<string, string> = {
  critical: "bg-danger/5",
  high: "bg-danger/[0.03]",
  medium: "bg-accent/[0.03]",
};

const SEVERITY_LABEL_STYLE: Record<string, string> = {
  critical: "bg-danger/15 text-danger",
  high: "bg-danger/10 text-danger/80",
  medium: "bg-accent/10 text-accent",
};

const SOURCE_LABELS: Record<string, string> = {
  "deleted-tweet": "Deleted Tweet",
  tweet: "Tweet",
  dm: "Direct Message",
  interest: "Interest",
  ad: "Ad Impression",
  grok: "Grok Conversation",
  contact: "Uploaded Contact",
  app: "Connected App",
  device: "Device",
  "off-twitter": "Off-Platform",
};

// --- Component --------------------------------------------------------------

export default function TheReceipts({ archive, onNavigate }: TheReceiptsProps) {
  const stack = useMemo(() => buildEvidenceStack(archive), [archive]);

  if (stack.findings.length === 0) {
    return (
      <div>
        <SectionHeader
          title="The Receipts"
          description="Concrete evidence from your archive backing each finding."
        />
        <EmptyState
          title="Not enough data"
          description="We need more data in your archive to surface concrete evidence."
        />
      </div>
    );
  }

  const criticalCount = stack.findings.filter(
    (f) => f.severity === "critical",
  ).length;

  return (
    <div>
      <SectionHeader
        title="The Receipts"
        description="Not just stats — actual evidence from your archive. Your tweets, your interests, your data. The proof."
        badge={`${stack.totalEvidenceCount} pieces of evidence`}
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Findings with proof"
          value={stack.findings.length}
          variant="danger"
        />
        <StatCard
          label="Evidence items"
          value={stack.totalEvidenceCount}
          variant="accent"
        />
        {criticalCount > 0 && (
          <StatCard label="Critical" value={criticalCount} variant="danger" />
        )}
      </div>

      {/* Findings */}
      <div className="space-y-4">
        {stack.findings.map((finding) => (
          <EvidenceCard
            key={finding.findingId}
            finding={finding}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

// --- Evidence finding card --------------------------------------------------

function EvidenceCard({
  finding,
  onNavigate,
}: {
  readonly finding: EvidenceFinding;
  readonly onNavigate?: ((sectionId: string) => void) | undefined;
}) {
  const [expanded, setExpanded] = useState(true);
  const borderClass = SEVERITY_BORDER[finding.severity] ?? "border-border";
  const bgClass = SEVERITY_BG[finding.severity] ?? "bg-background-raised";
  const labelStyleClass =
    SEVERITY_LABEL_STYLE[finding.severity] ??
    "bg-foreground-muted/10 text-foreground-muted";

  return (
    <div className={`rounded-xl border ${borderClass} ${bgClass}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${labelStyleClass}`}
            >
              {finding.severity}
            </span>
            <span className="text-xs font-medium text-foreground-muted">
              {finding.label}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground leading-snug">
            {finding.claim}
          </p>
        </div>
        <span className="shrink-0 pt-1 text-foreground-muted transition-transform">
          {expanded ? "▾" : "▸"}
        </span>
      </button>

      {/* Evidence items */}
      {expanded && (
        <div className="border-t border-border/30 px-4 pb-4 pt-3">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
            Evidence
          </div>
          <div className="space-y-2">
            {finding.evidence.map((item, i) => (
              <EvidenceItemCard key={i} item={item} />
            ))}
          </div>

          {/* Navigation link */}
          {onNavigate && finding.findingId && (
            <button
              type="button"
              onClick={() => {
                const sectionMap: Record<string, string> = {
                  "deletion-lie": "deleted-tweets",
                  "zombie-interests": "interests",
                  "grok-confessions": "grok",
                  "ad-revenue": "ad-targeting",
                  "off-platform": "off-twitter",
                  "contact-spillage": "contacts",
                };
                const target = sectionMap[finding.findingId];
                if (target) onNavigate(target);
              }}
              className="mt-3 text-xs font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Explore full details →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// --- Individual evidence item -----------------------------------------------

function EvidenceItemCard({ item }: { readonly item: EvidenceItem }) {
  const sourceLabel = SOURCE_LABELS[item.source] ?? item.source;

  return (
    <div className="rounded-lg border border-border/30 bg-background/50 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground leading-snug">
            {item.source === "deleted-tweet" || item.source === "grok" ? (
              <span className="italic">&ldquo;{item.text}&rdquo;</span>
            ) : (
              item.text
            )}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded bg-background-raised px-1.5 py-0.5 text-[10px] font-medium text-foreground-muted">
              {sourceLabel}
            </span>
            {item.date && (
              <span className="text-[10px] text-foreground-muted">
                {item.date}
              </span>
            )}
            {item.context && (
              <span className="text-[10px] text-foreground-muted">
                · {item.context}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
