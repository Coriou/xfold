"use client";

import { useState } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { PillBadge } from "@/components/shared/pill-badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import { formatDate, parseUserAgent, pluralize, truncate } from "@/lib/format";
import type { DeviceToken, KeyRegistryDevice, NiDevice } from "@/lib/archive/types";

type Tab = "tokens" | "devices" | "keys";

export default function Devices({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const [tab, setTab] = useState<Tab>("tokens");
  const { deviceTokens, niDevices, keyRegistryDevices } = archive;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "tokens", label: "App Tokens", count: deviceTokens.length },
    { id: "devices", label: "Push/Messaging", count: niDevices.length },
    { id: "keys", label: "Encryption Keys", count: keyRegistryDevices.length },
  ];

  const total = deviceTokens.length + niDevices.length + keyRegistryDevices.length;

  return (
    <div>
      <SectionHeader
        title="Devices & App Authorizations"
        description={`X recorded ${pluralize(deviceTokens.length, "app authorization token")}, ${pluralize(niDevices.length, "notification device")}, and ${pluralize(keyRegistryDevices.length, "encryption key")}. App tokens are OAuth grants — not necessarily distinct hardware.`}
        badge={String(total)}
      />

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              tab === t.id
                ? "bg-accent-muted/30 font-medium text-accent"
                : "text-foreground-muted hover:bg-background-raised hover:text-foreground"
            }`}
          >
            {t.label}
            <span className="font-mono text-xs opacity-60">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "tokens" && <TokenTable data={deviceTokens} />}
      {tab === "devices" && <NiDeviceCards data={niDevices} />}
      {tab === "keys" && <KeyTable data={keyRegistryDevices} />}
    </div>
  );
}

function TokenTable({ data }: { data: DeviceToken[] }) {
  const columns: Column<DeviceToken>[] = [
    {
      key: "name",
      label: "Application",
      render: (d) => d.clientApplicationName || "Unknown",
      sortable: true,
      sortValue: (d) => d.clientApplicationName,
    },
    {
      key: "created",
      label: "Created",
      render: (d) => formatDate(d.createdAt),
      sortable: true,
      sortValue: (d) => d.createdAt,
    },
    {
      key: "lastSeen",
      label: "Last Seen",
      render: (d) => formatDate(d.lastSeenAt),
      sortable: true,
      sortValue: (d) => d.lastSeenAt,
    },
    {
      key: "token",
      label: "Token",
      render: (d) => (
        <span title={d.token}>{truncate(d.token, 20)}</span>
      ),
      mono: true,
    },
  ];

  return <DataTable data={data} columns={columns} />;
}

function NiDeviceCards({ data }: { data: NiDevice[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground-muted">
        No notification devices found.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((d, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-background-raised p-4"
        >
          <div className="flex items-start justify-between">
            <p className="font-medium text-foreground">{d.deviceType}</p>
            <PillBadge variant={d.type === "messaging" ? "danger" : "accent"}>
              {d.type}
            </PillBadge>
          </div>
          {d.udid && (
            <p className="mt-2 font-mono text-xs text-foreground-muted" title={d.udid}>
              {truncate(d.udid, 24)}
            </p>
          )}
          {d.phoneNumber && (
            <p className="mt-1 font-mono text-sm text-danger">
              {d.phoneNumber}
            </p>
          )}
          {d.carrier && (
            <p className="mt-1 text-xs text-foreground-muted">
              Carrier: {d.carrier}
            </p>
          )}
          <p className="mt-2 text-xs text-foreground-muted">
            Created {formatDate(d.createdDate)}
          </p>
        </div>
      ))}
    </div>
  );
}

function KeyTable({ data }: { data: KeyRegistryDevice[] }) {
  const columns: Column<KeyRegistryDevice>[] = [
    {
      key: "ua",
      label: "Browser / OS",
      render: (d) => (
        <span title={d.userAgent}>{parseUserAgent(d.userAgent)}</span>
      ),
      sortable: true,
      sortValue: (d) => d.userAgent,
    },
    {
      key: "deviceId",
      label: "Device ID",
      render: (d) => truncate(d.deviceId, 16),
      mono: true,
    },
    {
      key: "created",
      label: "Registered",
      render: (d) => formatDate(d.createdAt),
      sortable: true,
      sortValue: (d) => d.createdAt,
    },
  ];

  return <DataTable data={data} columns={columns} />;
}
