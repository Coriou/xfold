"use client";

import { useMemo, useState } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PillBadge } from "@/components/shared/pill-badge";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import {
  buildShadowProfile,
  type ShadowCategory,
  type ShadowProfileEntry,
} from "@/lib/archive/insights/shadow-profile";
import { formatNumber } from "@/lib/format";

const PAGE_SIZE = 15;

const CATEGORY_LABELS: Record<ShadowCategory, string> = {
  identity: "Identity",
  demographics: "Demographics",
  location: "Location",
  behavior: "Behavior",
  tracking: "Tracking",
  monetization: "Monetization",
} as const;

const SEVERITY_DOT: Record<string, string> = {
  low: "bg-foreground-muted",
  medium: "bg-accent",
  high: "bg-danger",
} as const;

type Tab = "overview" | "explicit" | "inferred" | "hidden-demographics";

export default function ShadowProfile({ archive }: { archive: ParsedArchive }) {
  const shadow = useMemo(() => buildShadowProfile(archive), [archive]);

  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filteredInferred = useMemo(() => {
    if (!search) return shadow.inferred;
    const q = search.toLowerCase();
    return shadow.inferred.filter(
      (e) =>
        e.label.toLowerCase().includes(q) ||
        e.value.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q),
    );
  }, [shadow.inferred, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredInferred.length / PAGE_SIZE),
  );
  const pageItems = filteredInferred.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  if (shadow.explicitCount === 0 && shadow.inferredCount === 0) {
    return (
      <div>
        <SectionHeader
          title="Shadow Profile"
          description="What you shared vs. what X built about you."
        />
        <EmptyState
          title="No profile data found"
          description="Your archive doesn't contain enough data to build a shadow profile comparison."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Shadow Profile"
        description="What you told X vs. what X figured out on its own."
        badge={`${shadow.inferredCount} inferred data points`}
      />

      {/* Hero callout */}
      <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-5">
        <p className="text-lg font-bold text-danger">
          You shared {shadow.explicitCount} things. X inferred{" "}
          {shadow.inferredCount} more.
        </p>
        <p className="mt-2 text-sm text-foreground-muted">
          For every piece of data you gave X, they built{" "}
          <span className="font-mono font-semibold text-foreground">
            {shadow.inferredRatio}×
          </span>{" "}
          more data points about you from your behavior, device fingerprints, IP
          addresses, and third-party data brokers.
          {shadow.unconfirmedInterestCount > 0 && (
            <>
              {" "}
              Of {formatNumber(shadow.totalInterestCount)} interests assigned,{" "}
              <span className="font-semibold text-danger">
                {formatNumber(shadow.unconfirmedInterestCount)}
              </span>{" "}
              don&apos;t match anything you ever tweeted or liked.
            </>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="You shared"
          value={shadow.explicitCount}
          variant="default"
        />
        <StatCard
          label="X inferred"
          value={shadow.inferredCount}
          variant="danger"
        />
        <StatCard
          label="Inference ratio"
          value={`${shadow.inferredRatio}×`}
          variant={shadow.inferredRatio > 3 ? "danger" : "accent"}
        />
        <StatCard
          label="Hidden demographics"
          value={shadow.hiddenDemographics.length}
          variant={shadow.hiddenDemographics.length > 5 ? "danger" : "default"}
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {(
          [
            ["overview", "Side by Side"],
            ["explicit", `You Shared (${shadow.explicitCount})`],
            ["inferred", `X Inferred (${shadow.inferredCount})`],
            [
              "hidden-demographics",
              `Hidden Demographics (${shadow.hiddenDemographics.length})`,
            ],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setSearch("");
              setPage(1);
            }}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === id
                ? "bg-foreground text-background"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <SideBySideView explicit={shadow.explicit} inferred={shadow.inferred} />
      )}
      {tab === "explicit" && <EntryList entries={shadow.explicit} />}
      {tab === "inferred" && (
        <div className="space-y-4">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search inferred data…"
          />
          <EntryList entries={pageItems} />
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
      {tab === "hidden-demographics" && (
        <HiddenDemographicsView demographics={shadow.hiddenDemographics} />
      )}
    </div>
  );
}

// --- Sub-components ---------------------------------------------------------

function SideBySideView({
  explicit,
  inferred,
}: {
  explicit: readonly ShadowProfileEntry[];
  inferred: readonly ShadowProfileEntry[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left — what you shared */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
          What You Shared
        </h3>
        <div className="space-y-2">
          {explicit.map((entry, i) => (
            <EntryCard key={i} entry={entry} />
          ))}
          {explicit.length === 0 && (
            <p className="py-4 text-center text-sm text-foreground-muted">
              No explicit data found
            </p>
          )}
        </div>
      </div>

      {/* Right — what X inferred */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-danger">
          What X Built About You
        </h3>
        <div className="space-y-2">
          {inferred.slice(0, 20).map((entry, i) => (
            <EntryCard key={i} entry={entry} />
          ))}
          {inferred.length > 20 && (
            <p className="py-2 text-center text-xs text-foreground-muted">
              + {formatNumber(inferred.length - 20)} more inferred data points
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EntryList({ entries }: { entries: readonly ShadowProfileEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground-muted">
        No entries to show.
      </p>
    );
  }

  // Group by category
  const groups = new Map<ShadowCategory, ShadowProfileEntry[]>();
  for (const entry of entries) {
    const group = groups.get(entry.category);
    if (group) {
      group.push(entry);
    } else {
      groups.set(entry.category, [entry]);
    }
  }

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([category, items]) => (
        <div key={category}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            {CATEGORY_LABELS[category]}
          </h4>
          <div className="space-y-2">
            {items.map((entry, i) => (
              <EntryCard key={i} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EntryCard({ entry }: { entry: ShadowProfileEntry }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background-raised p-3">
      <div
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[entry.severity]}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {entry.label}
          </span>
          <PillBadge variant={entry.source === "inferred" ? "danger" : "muted"}>
            {entry.source}
          </PillBadge>
        </div>
        <p className="mt-0.5 text-sm text-foreground-muted">{entry.value}</p>
      </div>
    </div>
  );
}

function HiddenDemographicsView({
  demographics,
}: {
  demographics: readonly {
    type: string;
    value: string;
    advertiserCount: number;
  }[];
}) {
  if (demographics.length === 0) {
    return (
      <EmptyState
        title="No hidden demographics"
        description="No demographic targeting criteria found beyond what's shown in your personalization data."
      />
    );
  }

  return (
    <div>
      <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
        <p className="text-sm text-foreground-muted">
          These demographic categories don&apos;t appear in your personalization
          settings — they&apos;re only visible as ad-targeting criteria.
          Advertisers used them to reach you, which means X assigned them to
          your profile behind the scenes.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            <tr>
              <th className="pb-2 pr-4">Type</th>
              <th className="pb-2 pr-4">Value</th>
              <th className="pb-2 text-right">Advertisers</th>
            </tr>
          </thead>
          <tbody>
            {demographics.map((d, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-2 pr-4 text-foreground-muted">{d.type}</td>
                <td className="py-2 pr-4 font-medium text-foreground">
                  {d.value}
                </td>
                <td className="py-2 text-right font-mono text-foreground-muted">
                  {d.advertiserCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
