"use client";

import { useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { PillBadge } from "@/components/shared/pill-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { buildAlgorithmicMirror } from "@/lib/archive/insights/algorithmic-mirror";
import { formatNumber } from "@/lib/format";

export default function AlgorithmicMirrorSection({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const mirror = useMemo(() => buildAlgorithmicMirror(archive), [archive]);

  if (!mirror) {
    return (
      <EmptyState
        title="Not enough data"
        description="This archive doesn't contain enough personalization or ad data to build an algorithmic profile."
      />
    );
  }

  const years = Math.floor(mirror.profileAgeDays / 365);

  return (
    <div>
      <SectionHeader
        title="X Thinks You Are…"
        description="This is the algorithmic portrait X built about you — assembled from personalization data, ad targeting criteria, and behavioral inferences. Not what you said. What they concluded."
      />

      {/* Generated bio card */}
      <div className="mb-8 rounded-2xl border border-accent/30 bg-accent/5 p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">
          Your algorithmic bio
        </p>
        <p className="text-lg leading-relaxed text-foreground">
          {mirror.generatedBio}
        </p>
        {mirror.profileAgeDays > 0 && (
          <p className="mt-3 text-sm text-foreground-muted">
            X has been building this profile for{" "}
            {years > 0
              ? `${formatNumber(years)} years`
              : `${formatNumber(mirror.profileAgeDays)} days`}
            .
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Inferred interests"
          value={mirror.totalInterests}
          variant="accent"
        />
        <StatCard label="Shows tracked" value={mirror.totalShows} />
        <StatCard label="Languages" value={mirror.languages.length} />
        <StatCard
          label="Advertisers targeting you"
          value={mirror.uniqueAdvertisers}
          variant={mirror.uniqueAdvertisers > 50 ? "danger" : "default"}
        />
      </div>

      {/* Identity card */}
      <div className="mb-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Identity snapshot
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mirror.gender && (
            <ProfileField label="Gender" value={capitalize(mirror.gender)} />
          )}
          {mirror.ageRange && (
            <ProfileField label="Age range" value={mirror.ageRange} />
          )}
          {mirror.location && (
            <ProfileField label="Location" value={mirror.location} />
          )}
          {mirror.languages.length > 0 && (
            <ProfileField
              label="Languages"
              value={mirror.languages.join(", ")}
            />
          )}
          {mirror.memberSince && (
            <ProfileField label="Member since" value={mirror.memberSince} />
          )}
          {mirror.topAdvertiser && (
            <ProfileField
              label="Top advertiser"
              value={mirror.topAdvertiser}
              variant="danger"
            />
          )}
        </div>
      </div>

      {/* Interests */}
      {mirror.topInterests.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Inferred interests
            {mirror.totalInterests > mirror.topInterests.length && (
              <span className="ml-2 text-sm font-normal text-foreground-muted">
                showing {mirror.topInterests.length} of{" "}
                {formatNumber(mirror.totalInterests)}
              </span>
            )}
          </h2>
          <div className="flex flex-wrap gap-2">
            {mirror.topInterests.map((interest) => (
              <PillBadge key={interest} variant="accent">
                {interest}
              </PillBadge>
            ))}
          </div>
        </div>
      )}

      {/* Shows */}
      {mirror.topShows.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Shows & media
            {mirror.totalShows > mirror.topShows.length && (
              <span className="ml-2 text-sm font-normal text-foreground-muted">
                showing {mirror.topShows.length} of{" "}
                {formatNumber(mirror.totalShows)}
              </span>
            )}
          </h2>
          <div className="flex flex-wrap gap-2">
            {mirror.topShows.map((show) => (
              <PillBadge key={show} variant="muted">
                {show}
              </PillBadge>
            ))}
          </div>
        </div>
      )}

      {/* Lookalike targets */}
      {mirror.lookalikeTargets.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Your &ldquo;type&rdquo; according to advertisers
          </h2>
          <p className="mb-3 text-sm text-foreground-muted">
            Advertisers think you look like followers of these accounts.
          </p>
          <div className="flex flex-wrap gap-2">
            {mirror.lookalikeTargets.map((target) => (
              <PillBadge key={target} variant="default">
                {target}
              </PillBadge>
            ))}
          </div>
        </div>
      )}

      {/* Hidden demographics */}
      {mirror.hiddenDemographics.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Hidden demographics
          </h2>
          <p className="mb-3 text-sm text-foreground-muted">
            These demographic slots appear in ad targeting criteria but X never
            shows them in your personalization settings.
          </p>
          <div className="space-y-2">
            {mirror.hiddenDemographics.map((demo) => (
              <div
                key={`${demo.type}::${demo.value}`}
                className="flex items-center justify-between rounded-lg border border-border bg-background-raised px-4 py-3"
              >
                <span className="text-sm text-foreground-muted">
                  {demo.type}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {demo.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Absurdities callout */}
      {mirror.absurdities.length > 0 && (
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
          <h2 className="mb-3 text-lg font-semibold text-danger">
            Wait, what?
          </h2>
          <ul className="space-y-2">
            {mirror.absurdities.map((a, i) => (
              <li key={i} className="text-sm leading-relaxed text-foreground">
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProfileField({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: "danger" | undefined;
}) {
  return (
    <div className="rounded-lg border border-border bg-background-raised p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        {label}
      </p>
      <p
        className={`mt-1 text-sm font-medium ${variant === "danger" ? "text-danger" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
