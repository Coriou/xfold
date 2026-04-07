"use client";

import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { PillBadge } from "@/components/shared/pill-badge";
import { formatDate, formatNumber } from "@/lib/format";

export default function Demographics({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const p = archive.personalization;

  if (!p) {
    return (
      <div>
        <SectionHeader
          title="What X Inferred About You"
          description="No personalization data found in your archive."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="What X Inferred About You"
        description="Demographics and audience data X built from your activity."
      />

      {/* Main profile card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-background-raised p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Gender
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-foreground">
            {p.gender || "Not inferred"}
          </p>
          <p className="mt-1 text-xs text-foreground-muted">inferred</p>
        </div>

        <div className="rounded-xl border border-border bg-background-raised p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Age Range
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-foreground">
            {p.inferredAge || "Unknown"}
          </p>
          <p className="mt-1 text-xs text-foreground-muted">inferred</p>
        </div>

        <div className="rounded-xl border border-border bg-background-raised p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Languages
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.languages.length > 0 ? (
              p.languages.map((l, i) => (
                <PillBadge
                  key={i}
                  variant={l.isDisabled ? "muted" : "default"}
                >
                  {l.isDisabled ? <s>{l.language}</s> : l.language}
                </PillBadge>
              ))
            ) : (
              <span className="text-sm text-foreground-muted">None</span>
            )}
          </div>
        </div>
      </div>

      {/* Audience / advertiser data */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Advertiser Audience Lists
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-danger">
            {formatNumber(p.numAudiences)}
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            Companies uploaded lists to target you specifically
          </p>
        </div>

        <div className="rounded-xl border border-danger/20 bg-danger/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Lookalike Audiences
          </p>
          <p className="mt-2 font-mono text-3xl font-bold text-danger">
            {formatNumber(p.lookalikeAdvertisers.length)}
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            Advertisers whose audience you resemble
          </p>
        </div>
      </div>

      {/* Lookalike advertiser list */}
      {p.lookalikeAdvertisers.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-background-raised p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Lookalike Advertisers
          </p>
          <div className="flex flex-wrap gap-1.5">
            {p.lookalikeAdvertisers.map((name, i) => (
              <PillBadge key={i} variant="danger">
                {name}
              </PillBadge>
            ))}
          </div>
        </div>
      )}

      {/* Partner interests — purchased from third parties */}
      {p.partnerInterests.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-background-raised p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Partner Interests
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            Interests purchased from third-party data brokers, distinct from
            X&apos;s own inferences. There are{" "}
            <span className="font-mono font-semibold text-foreground">
              {formatNumber(p.partnerInterests.length)}
            </span>
            .
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.partnerInterests.map((name, i) => (
              <PillBadge key={i} variant="muted">
                {name}
              </PillBadge>
            ))}
          </div>
        </div>
      )}

      {/* Do-not-reach advertisers — negative-audience targeting */}
      {p.doNotReachAdvertisers.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-background-raised p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Advertisers Paying NOT to Reach You
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            These brands explicitly paid X to <em>exclude</em> you from their
            campaigns &mdash; an inverse form of targeting.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.doNotReachAdvertisers.map((name, i) => (
              <PillBadge key={i} variant="muted">
                {name}
              </PillBadge>
            ))}
          </div>
        </div>
      )}

      {/* Location history — inferred from activity */}
      {p.locationHistory.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-background-raised p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Inferred Location History
          </p>
          <p className="mt-1 text-xs text-foreground-muted">
            X infers your location from the last 60 days of activity (not GPS).
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                <tr>
                  <th className="pb-2 pr-4">Captured</th>
                  <th className="pb-2 pr-4">City</th>
                  <th className="pb-2 pr-4">Region</th>
                  <th className="pb-2">Country</th>
                </tr>
              </thead>
              <tbody>
                {p.locationHistory.map((h, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-1.5 pr-4 font-mono text-xs text-foreground-muted">
                      {h.capturedAt ? formatDate(h.capturedAt) : "—"}
                    </td>
                    <td className="py-1.5 pr-4">{h.city ?? "—"}</td>
                    <td className="py-1.5 pr-4">{h.region ?? "—"}</td>
                    <td className="py-1.5">{h.country ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
