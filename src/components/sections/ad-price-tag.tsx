"use client";

import { useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { BarList } from "@/components/shared/bar-list";
import { buildAdPriceTag } from "@/lib/archive/insights/ad-price-tag";
import { formatNumber } from "@/lib/format";

export default function AdPriceTagSection({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const priceTag = useMemo(() => buildAdPriceTag(archive), [archive]);

  if (!priceTag) {
    return (
      <EmptyState
        title="No ad data"
        description="This archive doesn't contain ad impression data."
      />
    );
  }

  const formattedRevenue = formatCurrency(priceTag.estimatedRevenue);

  return (
    <div>
      <SectionHeader
        title="Your Ad Price Tag"
        description="How much X earned from showing you ads — estimated from your ad impression data and public CPM benchmarks by targeting type."
      />

      {/* Hero revenue card */}
      <div className="mb-8 rounded-2xl border border-accent/30 bg-accent/5 p-8 text-center">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">
          Estimated ad revenue from your attention
        </p>
        <p className="font-mono text-5xl font-bold text-foreground">
          {formattedRevenue}
        </p>
        <p className="mt-3 text-sm text-foreground-muted">
          Based on {formatNumber(priceTag.totalImpressions)} ad impressions from{" "}
          {formatNumber(priceTag.uniqueAdvertisers)} advertisers
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Per year"
          value={formatCurrency(priceTag.revenuePerYear)}
          subtitle="average across account lifetime"
        />
        <StatCard
          label="Advertisers"
          value={priceTag.uniqueAdvertisers}
          variant={priceTag.uniqueAdvertisers > 50 ? "danger" : "default"}
        />
        <StatCard
          label="Total impressions"
          value={formatNumber(priceTag.totalImpressions)}
        />
        <StatCard
          label="Engagements"
          value={formatNumber(priceTag.totalEngagements)}
          subtitle="times you interacted with an ad"
        />
      </div>

      {/* Biggest spender */}
      {priceTag.biggestSpender && (
        <div className="mb-8 rounded-2xl border border-danger/30 bg-danger/5 p-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-danger">
            Biggest spender on your attention
          </p>
          <p className="text-xl font-bold text-foreground">
            {priceTag.biggestSpender.name}
          </p>
          <p className="mt-1 text-sm text-foreground-muted">
            {formatNumber(priceTag.biggestSpender.impressions)} impressions ·
            estimated {formatCurrency(priceTag.biggestSpender.estimatedSpend)}{" "}
            spent reaching you
          </p>
        </div>
      )}

      {/* Revenue by category */}
      {priceTag.categoryBreakdown.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            What makes you valuable?
          </h2>
          <p className="mb-4 text-sm text-foreground-muted">
            Not all ad targeting costs the same. Retargeting and custom audience
            lists are the most expensive — and the most invasive.
          </p>
          <div className="space-y-3">
            {priceTag.categoryBreakdown.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between rounded-lg border border-border bg-background-raised px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {cat.category}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {Math.round(cat.percentage)}% of your ad value
                  </p>
                </div>
                <p className="font-mono text-sm font-semibold text-foreground">
                  {formatCurrency(cat.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Method breakdown */}
      {priceTag.methodBreakdown.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Targeting methods by estimated revenue
          </h2>
          <BarList
            items={priceTag.methodBreakdown.map((m) => ({
              label: m.method,
              value: m.impressions,
              subLabel: `~$${m.estimatedCpm.toFixed(1)} CPM · ${formatCurrency(m.estimatedRevenue)} est. revenue`,
            }))}
            maxItems={10}
            valueLabel="impressions"
          />
        </div>
      )}

      {/* Most expensive method callout */}
      {priceTag.mostExpensiveMethod && (
        <div className="rounded-2xl border border-border bg-background-raised p-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Most expensive thing about you
          </p>
          <p className="text-lg font-bold text-foreground">
            {priceTag.mostExpensiveMethod.method}
          </p>
          <p className="mt-1 text-sm text-foreground-muted">
            {formatNumber(priceTag.mostExpensiveMethod.impressions)} impressions
            at ~${priceTag.mostExpensiveMethod.estimatedCpm.toFixed(2)} CPM ={" "}
            {formatCurrency(priceTag.mostExpensiveMethod.estimatedRevenue)} in
            estimated revenue. This targeting type is expensive because it uses
            data X collected specifically about you.
          </p>
        </div>
      )}
    </div>
  );
}

function formatCurrency(amount: number): string {
  if (amount < 0.01) return "$0.00";
  return `$${amount.toFixed(2)}`;
}
