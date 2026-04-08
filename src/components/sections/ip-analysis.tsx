"use client";

import { useMemo, useState } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import {
  clusterBySubnet,
  buildIpTimeline,
  findNewIpEvents,
  aggregateIps,
  isPrivateIp,
} from "@/lib/archive/ip-analysis";
import {
  parseDate,
  formatDate,
  formatDateTime,
  formatNumber,
  formatHour,
  getDayLabel,
  pluralize,
} from "@/lib/format";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { BarList } from "@/components/shared/bar-list";
import { DataTable } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { PillBadge } from "@/components/shared/pill-badge";
import { EmptyState } from "@/components/shared/empty-state";

type Tab = "networks" | "timeline" | "patterns" | "all";

export default function IpAnalysis({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const [tab, setTab] = useState<Tab>("networks");
  const [search, setSearch] = useState("");

  const data = useMemo(() => {
    const entries = archive.ipAudit;
    if (entries.length === 0) return null;

    const subnets = clusterBySubnet(entries);
    const timeline = buildIpTimeline(entries);
    const newIpEvents = findNewIpEvents(entries);
    const allIps = aggregateIps(entries);

    const uniqueIps = allIps.length;
    const privateIps = allIps.filter((ip) => isPrivateIp(ip.ip)).length;

    // Date range
    const dates = entries
      .map((e) => parseDate(e.createdAt))
      .filter(Boolean) as Date[];
    const firstDate = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
    const lastDate = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

    // Day-of-week / hour-of-day distributions
    const dayDist = new Map<number, number>();
    const hourDist = new Map<number, number>();
    for (const entry of entries) {
      const d = parseDate(entry.createdAt);
      if (!d) continue;
      dayDist.set(d.getDay(), (dayDist.get(d.getDay()) ?? 0) + 1);
      hourDist.set(d.getHours(), (hourDist.get(d.getHours()) ?? 0) + 1);
    }

    const dayItems = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
      label: getDayLabel(day, true),
      value: dayDist.get(day) ?? 0,
    }));

    const hourItems = Array.from({ length: 24 }, (_, h) => ({
      label: formatHour(h),
      value: hourDist.get(h) ?? 0,
    })).filter((h) => h.value > 0);

    // Creation IP comparison
    const creationIp = archive.account?.creationIp;
    const creationIpStillActive = creationIp
      ? allIps.some((ip) => ip.ip === creationIp)
      : false;

    // Summary callout
    const calloutParts: string[] = [];
    calloutParts.push(
      `Your logins came from ${pluralize(subnets.length, "distinct network")}.`,
    );
    if (privateIps > 0) {
      calloutParts.push(
        `${pluralize(privateIps, "IP")} ${privateIps === 1 ? "appears" : "appear"} to be from private/VPN ranges.`,
      );
    }
    if (creationIp) {
      calloutParts.push(
        creationIpStillActive
          ? "Your account creation IP is still active in your login history."
          : "Your account creation IP no longer appears in recent logins.",
      );
    }

    return {
      subnets,
      timeline,
      newIpEvents,
      allIps,
      uniqueIps,
      privateIps,
      firstDate,
      lastDate,
      dayItems,
      hourItems,
      creationIp,
      creationIpStillActive,
      callout: calloutParts.join(" "),
    };
  }, [archive]);

  if (!data) {
    return (
      <div>
        <SectionHeader
          title="IP Intelligence"
          description="Where you've signed in from."
        />
        <EmptyState
          title="No login IP data found"
          description="Your archive doesn't contain ip-audit data. This usually means the file is missing — older archives sometimes ship without it."
        />
      </div>
    );
  }

  const q = search.toLowerCase();
  const filteredIps = search
    ? data.allIps.filter(
        (ip) => ip.ip.includes(q) || ip.subnet.includes(q),
      )
    : data.allIps;

  const tabs: { id: Tab; label: string }[] = [
    { id: "networks", label: "Networks" },
    { id: "timeline", label: "Timeline" },
    { id: "patterns", label: "Patterns" },
    { id: "all", label: "All IPs" },
  ];

  return (
    <div>
      <SectionHeader
        title="IP Intelligence"
        description={`Analysis of ${formatNumber(archive.ipAudit.length)} login events from ${formatNumber(data.uniqueIps)} unique IPs across ${formatNumber(data.subnets.length)} networks.`}
      />

      {/* Callout */}
      <div className="mb-6 rounded-xl border border-danger/20 bg-danger/5 p-5">
        <p className="text-sm font-medium text-danger">{data.callout}</p>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Unique IPs" value={data.uniqueIps} variant="danger" />
        <StatCard label="Networks" value={data.subnets.length} />
        <StatCard
          label="Private/VPN IPs"
          value={data.privateIps}
          variant={data.privateIps > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Date Range"
          value={
            data.firstDate && data.lastDate
              ? `${formatDate(data.firstDate.toISOString())} – ${formatDate(data.lastDate.toISOString())}`
              : "—"
          }
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              tab === t.id
                ? "bg-accent-muted/30 font-medium text-accent"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search (for applicable tabs) */}
      {(tab === "all" || tab === "networks") && (
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search IPs or subnets…"
            count={tab === "all" ? filteredIps.length : undefined}
          />
        </div>
      )}

      {/* Networks tab */}
      {tab === "networks" && (
        <div className="rounded-xl border border-border bg-background-raised p-5">
          <BarList
            items={data.subnets
              .filter(
                (s) =>
                  !search || s.prefix.includes(q),
              )
              .map((s) => ({
                label: s.prefix,
                value: s.totalLogins,
                subLabel: `${s.ips.size} ${s.ips.size === 1 ? "IP" : "IPs"} · ${formatDate(s.firstSeen)} – ${formatDate(s.lastSeen)}`,
              }))}
            valueLabel="logins"
          />
        </div>
      )}

      {/* Timeline tab */}
      {tab === "timeline" && (
        <div className="space-y-4">
          {/* Monthly chart */}
          <div className="rounded-xl border border-border bg-background-raised p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
              Logins by Month
            </h3>
            <BarList
              items={data.timeline.map((b) => ({
                label: b.month,
                value: b.loginCount,
                subLabel: `${b.uniqueIps} unique ${b.uniqueIps === 1 ? "IP" : "IPs"}${b.newIps.length > 0 ? ` · ${b.newIps.length} new` : ""}`,
              }))}
              valueLabel="logins"
            />
          </div>

          {/* New IP events */}
          <div className="rounded-xl border border-border bg-background-raised p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
              New IP Events
            </h3>
            <DataTable
              data={data.newIpEvents}
              columns={[
                {
                  key: "date",
                  label: "First Seen",
                  render: (e) => formatDateTime(e.date),
                  sortable: true,
                  sortValue: (e) => e.date,
                },
                {
                  key: "ip",
                  label: "IP Address",
                  render: (e) => e.ip,
                  mono: true,
                },
                {
                  key: "subnet",
                  label: "Network",
                  render: (e) => e.subnet,
                  mono: true,
                },
                {
                  key: "type",
                  label: "Type",
                  render: (e) => (
                    <PillBadge
                      variant={e.type === "private" ? "danger" : "default"}
                    >
                      {e.type}
                    </PillBadge>
                  ),
                  sortable: true,
                  sortValue: (e) => e.type,
                },
              ]}
              emptyMessage="No IP events found."
            />
          </div>
        </div>
      )}

      {/* Patterns tab */}
      {tab === "patterns" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-background-raised p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                Logins by Day of Week
              </h3>
              <BarList items={data.dayItems} valueLabel="logins" />
            </div>
            <div className="rounded-xl border border-border bg-background-raised p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                Logins by Hour
              </h3>
              <BarList items={data.hourItems} valueLabel="logins" />
            </div>
          </div>

          {/* Creation IP card */}
          {data.creationIp && (
            <div className="rounded-xl border border-border bg-background-raised p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                Account Creation IP
              </h3>
              <p className="text-sm text-foreground">
                Your account was created from{" "}
                <span className="font-mono text-danger">{data.creationIp}</span>
                {data.creationIpStillActive ? (
                  <span className="text-foreground-muted">
                    {" "}
                    — this IP is still active in your login history.
                  </span>
                ) : (
                  <span className="text-foreground-muted">
                    {" "}
                    — this IP no longer appears in your recent logins.
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* All IPs tab */}
      {tab === "all" && (
        <DataTable
          data={filteredIps}
          columns={[
            {
              key: "ip",
              label: "IP Address",
              render: (ip) => (
                <span className="text-danger">{ip.ip}</span>
              ),
              sortable: true,
              sortValue: (ip) => ip.ip,
              mono: true,
            },
            {
              key: "subnet",
              label: "Network",
              render: (ip) => ip.subnet,
              mono: true,
            },
            {
              key: "logins",
              label: "Logins",
              render: (ip) => formatNumber(ip.loginCount),
              sortable: true,
              sortValue: (ip) => ip.loginCount,
              align: "right" as const,
              mono: true,
            },
            {
              key: "firstSeen",
              label: "First Seen",
              render: (ip) => formatDate(ip.firstSeen),
              sortable: true,
              sortValue: (ip) => ip.firstSeen,
            },
            {
              key: "lastSeen",
              label: "Last Seen",
              render: (ip) => formatDate(ip.lastSeen),
              sortable: true,
              sortValue: (ip) => ip.lastSeen,
            },
            {
              key: "type",
              label: "Type",
              render: (ip) => (
                <PillBadge
                  variant={ip.type === "private" ? "danger" : "default"}
                >
                  {ip.type}
                </PillBadge>
              ),
              sortable: true,
              sortValue: (ip) => ip.type,
            },
          ]}
          emptyMessage="No IP data found."
        />
      )}
    </div>
  );
}
