"use client";

import { useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { BarList } from "@/components/shared/bar-list";
import { PillBadge } from "@/components/shared/pill-badge";
import { formatDate, formatNumber, pluralize, parseDate } from "@/lib/format";
import { safeHref } from "@/lib/safe-href";

interface ScoredApp {
  id: string;
  name: string;
  description: string;
  organizationName: string;
  organizationUrl: string | null;
  permissions: string[];
  approvedAt: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  tweetCount: number;
  ageYears: number;
  staleness: "current" | "stale" | "very-stale";
}

function matchSource(
  appName: string,
  sourceMap: Map<string, number>,
): number {
  const appLower = appName.toLowerCase();
  let total = 0;
  for (const [source, count] of sourceMap) {
    const srcLower = source.toLowerCase();
    if (srcLower.includes(appLower) || appLower.includes(srcLower)) {
      total += count;
    }
  }
  return total;
}

export default function ConnectedApps({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const { scored, stats } = useMemo(() => {
    // Build tweet source map
    const sourceMap = new Map<string, number>();
    for (const t of archive.tweets) {
      sourceMap.set(t.source, (sourceMap.get(t.source) ?? 0) + 1);
    }

    // Use archive generation date as the reference point (stable, no Date.now())
    const refDate =
      parseDate(archive.meta.generationDate) ?? new Date("2026-01-01");
    const refTime = refDate.getTime();
    const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

    const scoredApps: ScoredApp[] = archive.connectedApps.map((app) => {
      let riskScore = 0;
      const hasWrite = app.permissions.some((p) =>
        p.toLowerCase().includes("write"),
      );
      const hasDM = app.permissions.some((p) =>
        p.toLowerCase().includes("direct"),
      );

      if (hasWrite) riskScore += 3;
      if (hasDM) riskScore += 3;
      riskScore += Math.max(0, app.permissions.length - 1);

      // Age / staleness
      const approvedDate = parseDate(app.approvedAt);
      const ageYears = approvedDate
        ? (refTime - approvedDate.getTime()) / MS_PER_YEAR
        : 0;

      let staleness: ScoredApp["staleness"] = "current";
      if (ageYears > 5) {
        riskScore += 2;
        staleness = "very-stale";
      } else if (ageYears > 2) {
        riskScore += 1;
        staleness = "stale";
      }

      const riskLevel: ScoredApp["riskLevel"] =
        riskScore >= 5 ? "high" : riskScore >= 3 ? "medium" : "low";

      const tweetCount = matchSource(app.name, sourceMap);

      return {
        ...app,
        riskScore,
        riskLevel,
        tweetCount,
        ageYears,
        staleness,
      };
    });

    scoredApps.sort((a, b) => b.riskScore - a.riskScore);

    const totalApps = scoredApps.length;
    const highRisk = scoredApps.filter((a) => a.riskLevel === "high").length;
    const writeAccess = scoredApps.filter((a) =>
      a.permissions.some((p) => p.toLowerCase().includes("write")),
    ).length;
    const stale = scoredApps.filter((a) => a.staleness !== "current").length;

    return {
      scored: scoredApps,
      stats: { totalApps, highRisk, writeAccess, stale },
    };
  }, [archive]);

  const riskBarItems = scored.map((app) => ({
    label: app.name,
    value: app.riskScore,
    subLabel: app.permissions.join(", "),
  }));

  return (
    <div>
      <SectionHeader
        title="Apps With Access to Your Account"
        description={`${pluralize(stats.totalApps, "third-party app")} ${stats.totalApps === 1 ? "has" : "have"} been granted access to your account.`}
        badge={String(stats.totalApps)}
      />

      {stats.totalApps === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-muted">
          No connected applications found in your archive.
        </p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total Apps" value={stats.totalApps} />
            <StatCard
              label="High Risk"
              value={stats.highRisk}
              variant="danger"
            />
            <StatCard
              label="Write Access"
              value={stats.writeAccess}
              variant="danger"
            />
            <StatCard
              label="Stale Apps"
              value={stats.stale}
              subtitle="> 2 years old"
            />
          </div>

          {/* Risk overview */}
          {scored.length > 0 && (
            <div className="mb-6 rounded-xl border border-border bg-background-raised p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                Risk Overview
              </h3>
              <BarList items={riskBarItems} valueLabel="risk score" />
            </div>
          )}

          {/* App cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {scored.map((app) => (
              <div
                key={app.id}
                className="flex flex-col rounded-xl border border-border bg-background-raised p-5"
              >
                {/* Header with risk badge */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {app.name}
                  </h3>
                  <PillBadge
                    variant={
                      app.riskLevel === "high"
                        ? "danger"
                        : app.riskLevel === "medium"
                          ? "default"
                          : "muted"
                    }
                  >
                    {app.riskLevel === "high"
                      ? "High Risk"
                      : app.riskLevel === "medium"
                        ? "Medium"
                        : "Low"}
                  </PillBadge>
                </div>

                {app.organizationName && (
                  <p className="mt-0.5 text-sm text-foreground-muted">
                    {(() => {
                      const safe = safeHref(app.organizationUrl);
                      return safe ? (
                        <a
                          href={safe}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:text-accent-hover"
                        >
                          {app.organizationName}
                        </a>
                      ) : (
                        app.organizationName
                      );
                    })()}
                  </p>
                )}

                {app.description && (
                  <p className="mt-2 text-sm text-foreground-muted line-clamp-3">
                    {app.description}
                  </p>
                )}

                {/* Permissions */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {app.permissions.map((perm, i) => (
                    <PillBadge
                      key={i}
                      variant={
                        perm.toLowerCase().includes("write") ||
                        perm.toLowerCase().includes("direct")
                          ? "danger"
                          : "default"
                      }
                    >
                      {perm}
                    </PillBadge>
                  ))}
                </div>

                {/* Tweet activity */}
                {app.tweetCount > 0 ? (
                  <p className="mt-2 text-sm text-foreground-muted">
                    Posted {formatNumber(app.tweetCount)}{" "}
                    {app.tweetCount === 1 ? "tweet" : "tweets"}
                  </p>
                ) : app.permissions.some((p) =>
                    p.toLowerCase().includes("write"),
                  ) ? (
                  <p className="mt-2 text-sm text-danger">
                    Has write access but never posted
                  </p>
                ) : null}

                {/* Approval date with staleness */}
                <p
                  className={`mt-auto pt-3 font-mono text-xs ${
                    app.staleness === "very-stale"
                      ? "text-danger"
                      : app.staleness === "stale"
                        ? "text-foreground"
                        : "text-foreground-muted"
                  }`}
                >
                  Approved {formatDate(app.approvedAt)}
                  {app.staleness !== "current" && (
                    <span> ({Math.floor(app.ageYears)} years ago)</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
