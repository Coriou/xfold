"use client";

import { useState, useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { SearchInput } from "@/components/shared/search-input";
import { BarList } from "@/components/shared/bar-list";
import { DataTable, type Column } from "@/components/shared/data-table";
import { formatNumber, pluralize } from "@/lib/format";

interface AggCriterion {
  targetingType: string;
  targetingValue: string;
  count: number;
}

export default function AdTargeting({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const advertiserMap = new Map<string, number>();
    const typeMap = new Map<string, number>();
    const criteriaMap = new Map<string, AggCriterion>();
    let totalImpressions = 0;
    let totalEngagements = 0;

    for (const batch of archive.adImpressions) {
      for (const imp of batch.impressions) {
        totalImpressions++;
        advertiserMap.set(
          imp.advertiserName,
          (advertiserMap.get(imp.advertiserName) ?? 0) + 1,
        );
        for (const c of imp.targetingCriteria) {
          typeMap.set(c.targetingType, (typeMap.get(c.targetingType) ?? 0) + 1);
          const key = `${c.targetingType}::${c.targetingValue ?? ""}`;
          const existing = criteriaMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            criteriaMap.set(key, {
              targetingType: c.targetingType,
              targetingValue: c.targetingValue ?? "",
              count: 1,
            });
          }
        }
      }
    }

    for (const batch of archive.adEngagements) {
      for (const eng of batch.engagements) {
        totalEngagements++;
        advertiserMap.set(
          eng.advertiserName,
          (advertiserMap.get(eng.advertiserName) ?? 0) + 1,
        );
        for (const c of eng.targetingCriteria) {
          typeMap.set(c.targetingType, (typeMap.get(c.targetingType) ?? 0) + 1);
          const key = `${c.targetingType}::${c.targetingValue ?? ""}`;
          const existing = criteriaMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            criteriaMap.set(key, {
              targetingType: c.targetingType,
              targetingValue: c.targetingValue ?? "",
              count: 1,
            });
          }
        }
      }
    }

    const topAdvertisers = [...advertiserMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const targetingTypes = [...typeMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const allCriteria = [...criteriaMap.values()].sort(
      (a, b) => b.count - a.count,
    );

    return {
      totalImpressions,
      totalEngagements,
      uniqueAdvertisers: advertiserMap.size,
      uniqueTypes: typeMap.size,
      topAdvertisers,
      targetingTypes,
      allCriteria,
    };
  }, [archive.adImpressions, archive.adEngagements]);

  const filteredCriteria = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return stats.allCriteria;
    return stats.allCriteria.filter(
      (c) =>
        c.targetingType.toLowerCase().includes(q) ||
        c.targetingValue.toLowerCase().includes(q),
    );
  }, [stats.allCriteria, search]);

  const criteriaColumns: Column<AggCriterion>[] = [
    {
      key: "type",
      label: "Targeting Type",
      render: (c) => c.targetingType,
      sortable: true,
      sortValue: (c) => c.targetingType,
    },
    {
      key: "value",
      label: "Value",
      render: (c) => c.targetingValue || "\u2014",
      sortable: true,
      sortValue: (c) => c.targetingValue,
    },
    {
      key: "count",
      label: "Ads",
      render: (c) => formatNumber(c.count),
      sortable: true,
      sortValue: (c) => c.count,
      align: "right",
      mono: true,
    },
  ];

  return (
    <div>
      <SectionHeader
        title="How Advertisers Targeted You"
        description={`${formatNumber(stats.totalImpressions + stats.totalEngagements)} ad events from ${pluralize(stats.uniqueAdvertisers, "advertiser")}.`}
        badge={String(stats.uniqueAdvertisers)}
      />

      {/* Callout */}
      <div className="mb-6 rounded-xl border border-danger/20 bg-danger/5 p-4">
        <p className="text-sm text-foreground">
          <span className="font-mono font-bold text-danger">
            {formatNumber(stats.uniqueAdvertisers)}
          </span>{" "}
          advertisers targeted you using{" "}
          <span className="font-mono font-bold text-danger">
            {formatNumber(stats.uniqueTypes)}
          </span>{" "}
          different targeting methods across{" "}
          <span className="font-mono font-bold text-danger">
            {formatNumber(stats.totalImpressions)}
          </span>{" "}
          ad impressions.
        </p>
      </div>

      {/* Top advertisers + targeting types side by side */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background-raised p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Top Advertisers
          </h3>
          <BarList items={stats.topAdvertisers} maxItems={10} />
        </div>
        <div className="rounded-xl border border-border bg-background-raised p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Targeting Methods
          </h3>
          <BarList items={stats.targetingTypes} maxItems={10} />
        </div>
      </div>

      {/* All criteria table */}
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
        All Targeting Criteria
      </h3>
      <div className="mb-4 max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search criteria…"
          count={search ? filteredCriteria.length : undefined}
        />
      </div>
      <DataTable
        data={filteredCriteria}
        columns={criteriaColumns}
        emptyMessage="No targeting criteria found."
      />
    </div>
  );
}
