"use client";

import { useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { computeBenchmarks } from "@/lib/archive/insights/benchmarks";
import { SectionHeader } from "@/components/shared/section-header";
import { EmptyState } from "@/components/shared/empty-state";

export default function DataBenchmarks({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const benchmarks = useMemo(() => computeBenchmarks(archive), [archive]);

  if (benchmarks.length === 0) {
    return (
      <div>
        <SectionHeader
          title="How You Compare"
          description="Your data footprint vs. the typical X user."
        />
        <EmptyState title="Not enough data for comparison" />
      </div>
    );
  }

  const concerning = benchmarks.filter((b) => b.isConcerning);
  const normal = benchmarks.filter((b) => !b.isConcerning);

  return (
    <div>
      <SectionHeader
        title="How You Compare"
        description="Your data footprint vs. the typical X user."
        badge={
          concerning.length > 0
            ? `${concerning.length} above average`
            : undefined
        }
      />

      {/* Concerning metrics */}
      {concerning.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-danger">
            Above Average
          </h3>
          <div className="space-y-3">
            {concerning.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-danger/20 bg-danger/[0.03] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xl font-bold text-danger">
                        {b.value.toLocaleString()}
                      </span>
                      {b.multiplier && b.multiplier > 1.5 && (
                        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
                          {b.multiplier.toFixed(1)}× avg
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-foreground">
                      {b.comparison}
                    </p>
                  </div>
                </div>
                <p className="mt-1 text-xs text-foreground-muted">
                  Typical: {b.typicalRange}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Normal metrics */}
      {normal.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Within Range
          </h3>
          <div className="space-y-2">
            {normal.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-border bg-background-raised p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{b.comparison}</p>
                  <p className="text-xs text-foreground-muted">
                    Typical: {b.typicalRange}
                  </p>
                </div>
                <span className="ml-4 shrink-0 font-mono text-lg font-bold text-foreground">
                  {b.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
