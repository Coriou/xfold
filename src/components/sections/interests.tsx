"use client";

import { useState, useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { SearchInput } from "@/components/shared/search-input";
import { TagCloud } from "@/components/shared/tag-cloud";
import { Pagination } from "@/components/shared/pagination";
import { pluralize, formatNumber } from "@/lib/format";
import { buildInterestPipeline } from "@/lib/archive/insights/interest-pipeline";

type InterestTab = "audit" | "interests" | "shows";

const AUDIT_PAGE_SIZE = 30;

export default function Interests({ archive }: { archive: ParsedArchive }) {
  const p = archive.personalization;
  const [search, setSearch] = useState("");
  const [showDisabled, setShowDisabled] = useState(true);
  const [tab, setTab] = useState<InterestTab>("audit");
  const [auditFilter, setAuditFilter] = useState<
    "all" | "unconfirmed" | "monetized"
  >("all");
  const [auditPage, setAuditPage] = useState(1);

  const interests = useMemo(() => p?.interests ?? [], [p?.interests]);
  const shows = useMemo(() => p?.shows ?? [], [p?.shows]);
  const pipeline = useMemo(() => buildInterestPipeline(archive), [archive]);

  const activeCount = interests.filter((i) => !i.isDisabled).length;
  const disabledCount = interests.filter((i) => i.isDisabled).length;

  const filteredInterests = useMemo(() => {
    const q = search.toLowerCase();
    return interests
      .filter((i) => showDisabled || !i.isDisabled)
      .filter((i) => !q || i.name.toLowerCase().includes(q));
  }, [interests, search, showDisabled]);

  const filteredShows = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return shows;
    return shows.filter((s) => s.toLowerCase().includes(q));
  }, [shows, search]);

  const filteredAuditEntries = useMemo(() => {
    if (!pipeline) return [];
    const q = search.toLowerCase();
    return pipeline.entries
      .filter((e) => {
        if (auditFilter === "unconfirmed") return !e.confirmedByBehavior;
        if (auditFilter === "monetized") return e.advertiserCount > 0;
        return true;
      })
      .filter((e) => !q || e.name.toLowerCase().includes(q));
  }, [pipeline, search, auditFilter]);

  const pagedAuditEntries = filteredAuditEntries.slice(
    (auditPage - 1) * AUDIT_PAGE_SIZE,
    auditPage * AUDIT_PAGE_SIZE,
  );

  if (!p) {
    return (
      <div>
        <SectionHeader
          title="What X Thinks You Like"
          description="No personalization data found in your archive."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="What X Thinks You Like"
        description={`X inferred ${pluralize(activeCount, "interest")} about you${disabledCount > 0 ? ` (${disabledCount} disabled)` : ""}, and tracked ${pluralize(shows.length, "show")}.`}
        badge={String(interests.length + shows.length)}
      />

      {/* Pipeline audit callout */}
      {pipeline && pipeline.unconfirmedButMonetized > 0 && (
        <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm font-semibold text-danger">
            X assigned you {formatNumber(pipeline.totalInterests)} interests.
            Only {formatNumber(pipeline.confirmedCount)} match anything you ever
            tweeted or liked. {formatNumber(pipeline.unconfirmedCount)} are pure
            guesses
            {pipeline.unconfirmedButMonetized > 0 && (
              <>
                {" "}
                &mdash; and {formatNumber(pipeline.unconfirmedButMonetized)} of
                those guesses were sold to advertisers
              </>
            )}
            .
          </p>
          {pipeline.worstOffender && (
            <p className="mt-2 text-xs text-foreground-muted">
              Worst offender: &ldquo;{pipeline.worstOffender.name}&rdquo;
              &mdash; you never mentioned it, but{" "}
              {formatNumber(pipeline.worstOffender.advertiserCount)}{" "}
              {pipeline.worstOffender.advertiserCount === 1
                ? "advertiser"
                : "advertisers"}{" "}
              targeted you for it across{" "}
              {formatNumber(pipeline.worstOffender.adImpressions)} ad
              impressions.
            </p>
          )}
        </div>
      )}

      {/* Stats cards */}
      {pipeline && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Confirmed by your content"
            value={pipeline.confirmedCount}
            variant="default"
          />
          <StatCard
            label="Unconfirmed guesses"
            value={pipeline.unconfirmedCount}
            variant="danger"
          />
          <StatCard
            label="Guesses sold to advertisers"
            value={pipeline.unconfirmedButMonetized}
            variant="danger"
          />
          <StatCard
            label="Interests monetized"
            value={pipeline.monetizedCount}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-2">
        {[
          { key: "audit" as const, label: "Interest Audit" },
          {
            key: "interests" as const,
            label: `All Interests (${interests.length})`,
          },
          { key: "shows" as const, label: `Shows (${shows.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setSearch("");
              setAuditPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              tab === t.key
                ? "bg-accent-muted/30 font-medium text-accent"
                : "text-foreground-muted hover:bg-background-raised hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "audit" && pipeline ? (
        <>
          {/* Audit filter + search */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex gap-1.5">
              {[
                { key: "all" as const, label: "All" },
                { key: "unconfirmed" as const, label: "Unconfirmed" },
                { key: "monetized" as const, label: "Monetized" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setAuditFilter(f.key);
                    setAuditPage(1);
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                    auditFilter === f.key
                      ? "bg-accent/20 text-accent"
                      : "text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="max-w-sm flex-1">
              <SearchInput
                value={search}
                onChange={(v) => {
                  setSearch(v);
                  setAuditPage(1);
                }}
                placeholder="Search interests…"
                count={search ? filteredAuditEntries.length : undefined}
              />
            </div>
          </div>

          {/* Audit entries */}
          <div className="space-y-2">
            {pagedAuditEntries.map((entry, index) => (
              <div
                key={`${entry.name}-${index}`}
                className="flex items-start gap-4 rounded-xl border border-border bg-background-raised p-4"
              >
                {/* Status indicator */}
                <div className="mt-0.5 shrink-0">
                  {entry.confirmedByBehavior ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-accent">
                      <span className="text-xs">&#10003;</span>
                    </div>
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-danger/20 text-danger">
                      <span className="text-xs">?</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {entry.name}
                    </span>
                    {entry.isDisabled && (
                      <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] text-foreground-muted">
                        Disabled
                      </span>
                    )}
                    {!entry.confirmedByBehavior && (
                      <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-medium text-danger">
                        No evidence in your tweets
                      </span>
                    )}
                  </div>

                  {/* Pipeline details */}
                  <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-foreground-muted">
                    {entry.advertiserCount > 0 && (
                      <span>
                        <span className="font-mono font-semibold text-danger">
                          {formatNumber(entry.advertiserCount)}
                        </span>{" "}
                        {entry.advertiserCount === 1
                          ? "advertiser"
                          : "advertisers"}
                      </span>
                    )}
                    {entry.adImpressions > 0 && (
                      <span>
                        <span className="font-mono font-semibold text-foreground">
                          {formatNumber(entry.adImpressions)}
                        </span>{" "}
                        ad impressions
                      </span>
                    )}
                    {entry.hasConversion && (
                      <span className="text-danger">
                        &#8226; Led to off-platform conversion
                      </span>
                    )}
                  </div>

                  {/* Top advertisers */}
                  {entry.topAdvertisers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {entry.topAdvertisers.map((adv, advIndex) => (
                        <span
                          key={`${adv}-${advIndex}`}
                          className="rounded-md bg-background px-2 py-0.5 text-[11px] text-foreground-muted"
                        >
                          {adv}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredAuditEntries.length > AUDIT_PAGE_SIZE && (
            <div className="mt-4">
              <Pagination
                page={auditPage}
                totalPages={Math.ceil(
                  filteredAuditEntries.length / AUDIT_PAGE_SIZE,
                )}
                onPageChange={setAuditPage}
              />
            </div>
          )}
        </>
      ) : tab === "audit" && !pipeline ? (
        <p className="py-8 text-center text-sm text-foreground-muted">
          Not enough data to run the interest audit. Interests and ad data are
          needed.
        </p>
      ) : null}

      {tab === "interests" && (
        <>
          {/* Search + controls */}
          <div className="mb-4 flex items-center gap-3">
            <div className="max-w-sm flex-1">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search interests…"
                count={search ? filteredInterests.length : undefined}
              />
            </div>
            {disabledCount > 0 && (
              <button
                onClick={() => setShowDisabled((s) => !s)}
                className="text-xs text-foreground-muted hover:text-foreground"
              >
                {showDisabled ? "Hide disabled" : "Show disabled"}
              </button>
            )}
          </div>

          <TagCloud
            tags={filteredInterests.map((i) => ({
              label: i.name,
              variant: i.isDisabled
                ? ("disabled" as const)
                : ("default" as const),
            }))}
          />
        </>
      )}

      {tab === "shows" && (
        <>
          <div className="mb-4 max-w-sm">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search shows…"
              count={search ? filteredShows.length : undefined}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredShows.map((show, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-background-raised px-3 py-2 text-sm text-foreground"
              >
                {show}
              </div>
            ))}
            {filteredShows.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-foreground-muted">
                No shows found.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
