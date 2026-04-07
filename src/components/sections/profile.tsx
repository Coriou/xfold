"use client";

import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { PillBadge } from "@/components/shared/pill-badge";
import { formatDate } from "@/lib/format";
import { safeHref } from "@/lib/safe-href";

export default function Profile({ archive }: { archive: ParsedArchive }) {
  const { account, profile } = archive;

  // Sort handle changes chronologically once for the hero strip.
  const handleChanges = [...archive.screenNameChanges].sort((a, b) =>
    a.changedAt.localeCompare(b.changedAt),
  );

  return (
    <div>
      <SectionHeader title="Your Profile" description="Account and profile information from your archive." />

      {/* Identity timeline hero — only renders when there's at least one change */}
      {handleChanges.length > 0 && account && (
        <div className="mb-4 rounded-xl border border-border bg-background-raised p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Identity Timeline
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {/* Earliest known handle is the "from" of the first change */}
            <PillBadge variant="muted">
              @{handleChanges[0]?.changedFrom}
            </PillBadge>
            {handleChanges.map((c, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="text-foreground-muted">→</span>
                <PillBadge variant={i === handleChanges.length - 1 ? "accent" : "muted"}>
                  @{c.changedTo}
                </PillBadge>
                <span className="text-xs text-foreground-muted">
                  {formatDate(c.changedAt)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Profile card */}
        <div className="rounded-xl border border-border bg-background-raised p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
            Profile
          </h3>
          {profile ? (
            <div>
              {account && (
                <div className="mb-4">
                  <p className="text-xl font-bold text-foreground">
                    {account.displayName}
                  </p>
                  <p className="text-sm text-foreground-muted">
                    @{account.username}
                  </p>
                </div>
              )}
              {profile.bio && (
                <p className="mb-3 text-sm text-foreground">{profile.bio}</p>
              )}
              <div className="space-y-1.5 text-sm">
                {profile.location && (
                  <p className="text-foreground-muted">
                    <span className="text-foreground">Location:</span>{" "}
                    {profile.location}
                  </p>
                )}
                {profile.website && (
                  <p className="text-foreground-muted">
                    <span className="text-foreground">Website:</span>{" "}
                    {(() => {
                      const safe = safeHref(profile.website);
                      return safe ? (
                        <a
                          href={safe}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:text-accent-hover"
                        >
                          {profile.website}
                        </a>
                      ) : (
                        <span className="text-foreground">{profile.website}</span>
                      );
                    })()}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground-muted">
              No profile data found.
            </p>
          )}
        </div>

        {/* Account details card */}
        {account && (
          <div className="rounded-xl border border-border bg-background-raised p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
              Account Details
            </h3>
            <div className="space-y-3 text-sm">
              <Row label="Account ID" mono muted>
                {account.accountId}
              </Row>
              <Row label="Created">
                {formatDate(account.createdAt)} via {account.createdVia}
              </Row>
              <Row label="Email" mono danger>
                {account.email}
              </Row>
              {account.phoneNumber && (
                <Row label="Phone" mono danger>
                  {account.phoneNumber}
                </Row>
              )}
              {account.timezone && (
                <Row label="Timezone">{account.timezone}</Row>
              )}
              {account.creationIp && (
                <Row label="Creation IP" mono danger>
                  {account.creationIp}
                </Row>
              )}
              <Row label="Verified">
                <PillBadge variant={account.verified ? "accent" : "muted"}>
                  {account.verified ? "Yes" : "No"}
                </PillBadge>
              </Row>
            </div>
          </div>
        )}

        {/* Age info card */}
        {account && (account.ageRange || account.birthDate) && (
          <div className="rounded-xl border border-border bg-background-raised p-6 lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
              Age Information
            </h3>
            <div className="flex gap-8">
              {account.ageRange && (
                <div>
                  <p className="text-xs text-foreground-muted">Age Range</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                    {account.ageRange}
                  </p>
                </div>
              )}
              {account.birthDate && (
                <div>
                  <p className="text-xs text-foreground-muted">Birth Date</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                    {account.birthDate}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  children,
  mono,
  danger,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  danger?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-foreground-muted">{label}</span>
      <span
        className={`text-right ${mono ? "font-mono text-xs" : ""} ${
          danger ? "text-danger" : muted ? "text-foreground-muted" : "text-foreground"
        }`}
      >
        {children}
      </span>
    </div>
  );
}
