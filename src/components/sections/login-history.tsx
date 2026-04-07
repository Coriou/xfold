"use client";

import { useState, useMemo } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { SearchInput } from "@/components/shared/search-input";
import { DataTable, type Column } from "@/components/shared/data-table";
import { BarList } from "@/components/shared/bar-list";
import { formatDateTime, pluralize } from "@/lib/format";

interface IpSummary {
  ip: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

export default function LoginHistory({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const [view, setView] = useState<"date" | "ip">("date");
  const [search, setSearch] = useState("");

  const entries = archive.ipAudit;
  const uniqueIps = useMemo(() => {
    const map = new Map<string, IpSummary>();
    for (const e of entries) {
      const existing = map.get(e.loginIp);
      if (existing) {
        existing.count++;
        if (e.createdAt < existing.firstSeen) existing.firstSeen = e.createdAt;
        if (e.createdAt > existing.lastSeen) existing.lastSeen = e.createdAt;
      } else {
        map.set(e.loginIp, {
          ip: e.loginIp,
          count: 1,
          firstSeen: e.createdAt,
          lastSeen: e.createdAt,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = search.toLowerCase();
    const sorted = [...entries].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    if (!q) return sorted;
    return sorted.filter((e) => e.loginIp.includes(q));
  }, [entries, search]);

  const columns: Column<(typeof entries)[0]>[] = [
    {
      key: "date",
      label: "Date",
      render: (e) => formatDateTime(e.createdAt),
      sortable: true,
      sortValue: (e) => e.createdAt,
    },
    {
      key: "ip",
      label: "IP Address",
      render: (e) => (
        <span className="font-mono text-danger">{e.loginIp}</span>
      ),
      sortable: true,
      sortValue: (e) => e.loginIp,
      mono: true,
    },
  ];

  return (
    <div>
      <SectionHeader
        title="Where Your Account Was Accessed"
        description={`${pluralize(entries.length, "login event")} from ${pluralize(uniqueIps.length, "unique IP address", "unique IP addresses")}.`}
        badge={String(entries.length)}
      />

      {/* View toggle */}
      <div className="mb-4 flex items-center gap-2">
        {(["date", "ip"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              view === v
                ? "bg-accent-muted/30 font-medium text-accent"
                : "text-foreground-muted hover:bg-background-raised hover:text-foreground"
            }`}
          >
            {v === "date" ? "By Date" : "By IP"}
          </button>
        ))}
      </div>

      {view === "date" ? (
        <>
          <div className="mb-4 max-w-sm">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Filter by IP…"
              count={search ? filteredEntries.length : undefined}
            />
          </div>
          <DataTable
            data={filteredEntries}
            columns={columns}
            emptyMessage="No login events found."
          />
        </>
      ) : (
        <div className="rounded-xl border border-border bg-background-raised p-5">
          <BarList
            items={uniqueIps.map((ip) => ({
              label: ip.ip,
              value: ip.count,
              subLabel: `${formatDateTime(ip.firstSeen)} \u2013 ${formatDateTime(ip.lastSeen)}`,
            }))}
            maxItems={20}
            valueLabel="logins"
          />
        </div>
      )}
    </div>
  );
}
