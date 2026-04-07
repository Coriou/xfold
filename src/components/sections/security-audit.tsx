"use client";

import { useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { buildSecurityAudit } from "@/lib/archive/insights/security-audit";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";

const SEVERITY_STYLES = {
  critical: "border-danger/30 bg-danger/5",
  warning: "border-accent/30 bg-accent/5",
  info: "border-border bg-background-raised",
} as const;

const SEVERITY_DOT = {
  critical: "bg-danger",
  warning: "bg-accent",
  info: "bg-foreground-muted",
} as const;

export default function SecurityAudit({ archive }: { archive: ParsedArchive }) {
  const audit = useMemo(() => buildSecurityAudit(archive), [archive]);

  if (!audit) {
    return (
      <div>
        <SectionHeader
          title="Account Security"
          description="Cross-references IPs, devices, and tweet clients to detect anomalies."
        />
        <EmptyState title="Not enough data for security analysis" />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Account Security"
        description="Cross-references IPs, devices, and tweet clients to detect anomalies."
        badge={
          audit.anomalies.length > 0
            ? `${audit.anomalies.length} anomalies`
            : undefined
        }
      />

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Unique IPs"
          value={audit.uniqueIps}
          variant={audit.uniqueIps > 50 ? "danger" : "default"}
        />
        <StatCard
          label="Devices"
          value={audit.deviceCount}
          variant={audit.deviceCount > 12 ? "danger" : "default"}
        />
        <StatCard
          label="Tweet clients"
          value={audit.clientCount}
          subtitle="apps used to post"
        />
        <StatCard label="Login events" value={audit.loginEvents} />
      </div>

      {/* Anomalies */}
      {audit.anomalies.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Detected Anomalies
          </h3>
          <div className="space-y-3">
            {audit.anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={`rounded-xl border p-4 ${SEVERITY_STYLES[anomaly.severity]}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${SEVERITY_DOT[anomaly.severity]}`}
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-foreground">
                      {anomaly.label}
                    </h4>
                    <p className="mt-0.5 text-sm text-foreground-muted">
                      {anomaly.detail}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tweet client timeline */}
      {audit.tweetSources.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-background-raised p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Tweet Client History
          </h3>
          <p className="mb-4 text-sm text-foreground-muted">
            Every app that ever posted on your behalf. Unfamiliar clients may
            indicate compromised access.
          </p>
          <div className="space-y-2">
            {audit.tweetSources.map((src) => {
              const widthPct = Math.max(
                5,
                Math.min(
                  100,
                  (src.count / (audit.tweetSources[0]?.count ?? 1)) * 100,
                ),
              );
              return (
                <div key={src.source} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-right text-xs text-foreground-muted">
                    {src.source}
                  </span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded bg-foreground/5">
                    <div
                      className="h-full rounded bg-accent/60"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right font-mono text-xs text-foreground-muted">
                    {src.count.toLocaleString()}
                  </span>
                  <span className="hidden w-36 shrink-0 text-right text-[10px] text-foreground-muted sm:block">
                    {formatDate(src.firstSeen)} – {formatDate(src.lastSeen)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Write-access apps callout */}
      {audit.writeAccessApps.length > 0 && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-5">
          <h3 className="mb-2 text-sm font-semibold text-danger">
            Apps with Write Access
          </h3>
          <p className="mb-3 text-sm text-foreground-muted">
            These apps can post tweets, read DMs, or modify your account. Review
            and revoke any you don&apos;t recognize.
          </p>
          <div className="flex flex-wrap gap-2">
            {audit.writeAccessApps.map((name) => (
              <span
                key={name}
                className="rounded-full border border-danger/20 bg-danger/10 px-3 py-1 text-xs font-medium text-danger"
              >
                {name}
              </span>
            ))}
          </div>
          <a
            href="https://x.com/settings/connected_apps"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Review connected apps ↗
          </a>
        </div>
      )}
    </div>
  );
}
