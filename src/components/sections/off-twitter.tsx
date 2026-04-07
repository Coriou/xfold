"use client";

import { useMemo, useState } from "react";
import type {
  BranchLinkEvent,
  InferredApp,
  ParsedArchive,
} from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { PillBadge } from "@/components/shared/pill-badge";
import {
  DataTable,
  type Column,
} from "@/components/shared/data-table";
import { formatDate, formatNumber } from "@/lib/format";

type View = "conversions" | "branch-links" | "inferred-apps";

export default function OffTwitter({ archive }: { archive: ParsedArchive }) {
  const [view, setView] = useState<View>("conversions");
  const ot = archive.offTwitter;

  const conversionRows = useMemo(() => {
    interface ConversionRow {
      kind: "mobile" | "online";
      attributed: boolean;
      time: string;
      label: string;
      detail: string;
      platform: string;
    }
    const rows: ConversionRow[] = [];

    for (const m of ot.mobileConversionsAttributed) {
      rows.push({
        kind: "mobile",
        attributed: true,
        time: m.conversionTime,
        label: m.conversionEventName || "(unknown event)",
        detail: m.applicationName,
        platform: m.mobilePlatform,
      });
    }
    for (const m of ot.mobileConversionsUnattributed) {
      rows.push({
        kind: "mobile",
        attributed: false,
        time: m.conversionTime,
        label: m.conversionEventName || "(unknown event)",
        detail: m.applicationName,
        platform: m.mobilePlatform,
      });
    }
    for (const o of ot.onlineConversionsAttributed) {
      rows.push({
        kind: "online",
        attributed: true,
        time: o.conversionTime,
        label: o.eventType || "(unknown event)",
        detail: o.advertiserName ?? o.conversionPlatform,
        platform: o.conversionPlatform,
      });
    }
    for (const o of ot.onlineConversionsUnattributed) {
      rows.push({
        kind: "online",
        attributed: false,
        time: o.conversionTime,
        label: o.eventType || "(unknown event)",
        detail: o.conversionUrl ?? o.advertiserName ?? o.conversionPlatform,
        platform: o.conversionPlatform,
      });
    }

    rows.sort((a, b) => b.time.localeCompare(a.time));
    return rows;
  }, [ot]);

  const totalConversions = conversionRows.length;
  const totalApps = ot.inferredApps.length;
  const totalBranchLinks = ot.branchLinks.length;
  const totalAll = totalConversions + totalApps + totalBranchLinks;
  const installCount =
    ot.mobileConversionsAttributed.length +
    ot.mobileConversionsUnattributed.length;
  const siteCount =
    ot.onlineConversionsAttributed.length +
    ot.onlineConversionsUnattributed.length;

  return (
    <div>
      <SectionHeader
        title="Off Twitter"
        description="Tracking that follows you off the platform."
        badge={String(totalAll)}
      />

      {/* Explainer banner */}
      <div className="mb-4 rounded-xl border border-danger/20 bg-danger/5 p-4">
        <p className="text-sm text-foreground">
          <span className="font-semibold text-danger">
            X ships these files in your archive but doesn&apos;t show them in
            the official viewer.
          </span>{" "}
          They contain off-platform tracking data &mdash; apps you installed
          and websites you visited &mdash; that advertisers reported back to X
          via conversion pixels and SDKs.
        </p>
      </div>

      {/* Headline stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="App installs tracked"
          value={installCount}
          variant={installCount > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Website visits tracked"
          value={siteCount}
          variant={siteCount > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Inferred apps on devices"
          value={totalApps}
          variant={totalApps > 0 ? "danger" : "default"}
        />
        <StatCard label="External link clicks" value={totalBranchLinks} />
      </div>

      {/* View toggle */}
      <div className="mb-4 flex items-center gap-2">
        {(
          [
            ["conversions", "App installs & web events"],
            ["branch-links", "External link clicks"],
            ["inferred-apps", "Apps X thinks you have"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              view === id
                ? "bg-accent-muted/30 font-medium text-accent"
                : "text-foreground-muted hover:bg-background-raised hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "conversions" &&
        (conversionRows.length === 0 ? (
          <EmptyTab text="No app-install or web-event tracking in your archive." />
        ) : (
          <ConversionsTable rows={conversionRows} />
        ))}

      {view === "branch-links" &&
        (ot.branchLinks.length === 0 ? (
          <EmptyTab text="No external link clicks tracked. (X only stores the last 21 days on iOS/Android.)" />
        ) : (
          <BranchLinksTable rows={ot.branchLinks} />
        ))}

      {view === "inferred-apps" &&
        (ot.inferredApps.length === 0 ? (
          <EmptyTab text="No apps inferred for your devices." />
        ) : (
          <InferredAppsGrid apps={ot.inferredApps} />
        ))}
    </div>
  );
}

interface ConversionRow {
  kind: "mobile" | "online";
  attributed: boolean;
  time: string;
  label: string;
  detail: string;
  platform: string;
}

function ConversionsTable({ rows }: { rows: ConversionRow[] }) {
  const columns: Column<ConversionRow>[] = [
    {
      key: "time",
      label: "When",
      render: (r) => formatDate(r.time),
      sortable: true,
      sortValue: (r) => r.time,
    },
    {
      key: "kind",
      label: "Kind",
      render: (r) => (
        <PillBadge variant={r.kind === "mobile" ? "accent" : "muted"}>
          {r.kind === "mobile" ? "App" : "Web"}
        </PillBadge>
      ),
    },
    {
      key: "label",
      label: "Event",
      render: (r) => r.label,
    },
    {
      key: "detail",
      label: "Where",
      render: (r) => (
        <span className="truncate text-sm text-foreground-muted">
          {r.detail}
        </span>
      ),
    },
    {
      key: "platform",
      label: "Platform",
      render: (r) => r.platform || "—",
    },
    {
      key: "attributed",
      label: "Attributed",
      render: (r) => (
        <PillBadge variant={r.attributed ? "danger" : "muted"}>
          {r.attributed ? "yes" : "no"}
        </PillBadge>
      ),
    },
  ];
  return <DataTable data={rows} columns={columns} />;
}

function BranchLinksTable({ rows }: { rows: BranchLinkEvent[] }) {
  const columns: Column<BranchLinkEvent>[] = [
    {
      key: "timestamp",
      label: "When",
      render: (r) => formatDate(r.timestamp),
      sortable: true,
      sortValue: (r) => r.timestamp,
    },
    {
      key: "referrer",
      label: "From",
      render: (r) => (
        <span className="truncate text-sm text-foreground-muted">
          {r.externalReferrerUrl || "—"}
        </span>
      ),
    },
    {
      key: "landing",
      label: "To",
      render: (r) => (
        <span className="truncate text-sm">{r.landingPage || "—"}</span>
      ),
    },
    {
      key: "campaign",
      label: "Campaign",
      render: (r) => r.campaign || "—",
    },
    {
      key: "feature",
      label: "Feature",
      render: (r) => r.feature || "—",
    },
  ];
  return <DataTable data={rows} columns={columns} />;
}

function InferredAppsGrid({ apps }: { apps: InferredApp[] }) {
  return (
    <div className="rounded-xl border border-border bg-background-raised p-5">
      <p className="mb-3 text-sm text-foreground-muted">
        X believes{" "}
        <span className="font-mono font-semibold text-foreground">
          {formatNumber(apps.length)}
        </span>{" "}
        apps are installed on your devices. These are inferences, not direct
        observations &mdash; X derives them from advertiser-shared signals.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <div
            key={app.appId}
            className="rounded-lg border border-border bg-background p-3"
          >
            <div className="text-sm font-medium text-foreground">
              {app.appNames[0] ?? app.appId}
            </div>
            {app.appNames.length > 1 && (
              <div className="mt-1 truncate text-xs text-foreground-muted">
                also: {app.appNames.slice(1).join(", ")}
              </div>
            )}
            <div className="mt-1 font-mono text-[10px] text-foreground-muted/60">
              {app.appId}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyTab({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-border bg-background-raised p-8 text-center text-sm text-foreground-muted">
      {text}
    </div>
  );
}
