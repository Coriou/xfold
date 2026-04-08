"use client";

import { useMemo, useState } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import {
  buildContactMap,
  computeConversationStats,
  type Contact,
  type RelationshipType,
} from "@/lib/archive/conversation-intelligence";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { BarList } from "@/components/shared/bar-list";
import { DataTable } from "@/components/shared/data-table";
import { SearchInput } from "@/components/shared/search-input";
import { PillBadge } from "@/components/shared/pill-badge";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { formatNumber, pluralize } from "@/lib/format";

type Tab = "contacts" | "channels" | "relationships";

const PAGE_SIZE = 50;

const RELATIONSHIP_BADGE: Record<
  RelationshipType,
  { label: string; variant: "accent" | "default" | "muted" | "danger" }
> = {
  mutual: { label: "Mutual", variant: "accent" },
  "following-only": { label: "Following", variant: "default" },
  "follower-only": { label: "Follower", variant: "muted" },
  blocked: { label: "Blocked", variant: "danger" },
  none: { label: "No relation", variant: "muted" },
};

function contactLabel(c: Contact): string {
  return c.screenName ? `@${c.screenName}` : `User ${c.accountId}`;
}

function interactionMix(c: Contact): string {
  if (c.totalInteractions === 0) return "";
  const parts: string[] = [];
  if (c.mentionCount > 0) {
    parts.push(
      `${Math.round((c.mentionCount / c.totalInteractions) * 100)}% mentions`,
    );
  }
  if (c.replyCount > 0) {
    parts.push(
      `${Math.round((c.replyCount / c.totalInteractions) * 100)}% replies`,
    );
  }
  if (c.privateInteractions > 0) {
    parts.push(
      `${Math.round((c.privateInteractions / c.totalInteractions) * 100)}% DMs`,
    );
  }
  return parts.join(", ");
}

export default function Conversations({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const [tab, setTab] = useState<Tab>("contacts");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const contacts = useMemo(() => buildContactMap(archive), [archive]);
  const stats = useMemo(() => computeConversationStats(contacts), [contacts]);

  const q = search.toLowerCase();
  const filtered = search
    ? contacts.filter(
        (c) =>
          (c.screenName?.toLowerCase().includes(q) ?? false) ||
          c.accountId.includes(q),
      )
    : contacts;

  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(0);
  };

  // Top contacts for BarList
  const topContacts = contacts.slice(0, 10).map((c) => ({
    label: contactLabel(c),
    value: c.totalInteractions,
    subLabel: interactionMix(c),
  }));

  // By channel
  const topPublic = contacts
    .filter((c) => c.publicInteractions > 0)
    .sort((a, b) => b.publicInteractions - a.publicInteractions)
    .slice(0, 10)
    .map((c) => ({
      label: contactLabel(c),
      value: c.publicInteractions,
      subLabel: `${c.mentionCount} mentions, ${c.replyCount} replies`,
    }));

  const topPrivate = contacts
    .filter((c) => c.privateInteractions > 0)
    .sort((a, b) => b.privateInteractions - a.privateInteractions)
    .slice(0, 10)
    .map((c) => ({
      label: contactLabel(c),
      value: c.privateInteractions,
      subLabel: `${c.dmSent} sent, ${c.dmReceived} received`,
    }));

  // Relationship groups
  const byRelationship = (type: RelationshipType) =>
    contacts
      .filter((c) => c.relationship === type && c.totalInteractions > 0)
      .slice(0, 10)
      .map((c) => ({
        label: contactLabel(c),
        value: c.totalInteractions,
      }));

  if (contacts.length === 0) {
    return (
      <div>
        <SectionHeader
          title="Conversations"
          description="Who you talk to most across tweets, replies, and DMs."
        />
        <EmptyState
          title="No interaction data found"
          description="Your archive doesn't contain enough tweet, mention, or DM data to reconstruct contacts. This usually means the relevant data files are missing or the account is brand new."
        />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "contacts", label: "Top Contacts" },
    { id: "channels", label: "By Channel" },
    { id: "relationships", label: "Relationships" },
  ];

  return (
    <div>
      <SectionHeader
        title="Conversations"
        description={`Cross-referencing mentions, replies, and DMs across ${formatNumber(stats.totalContacts)} unique contacts.`}
      />

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Contacts" value={stats.totalContacts} />
        <StatCard
          label="Mutual Follows"
          value={stats.contactsByRelationship.mutual}
          variant="accent"
        />
        <StatCard
          label="Both Channels"
          value={stats.bothChannelsContacts}
          subtitle="public + private"
        />
        <StatCard
          label="DMs with Strangers"
          value={stats.dmWithStrangers}
          variant={stats.dmWithStrangers > 0 ? "danger" : "default"}
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

      {/* Top Contacts tab */}
      {tab === "contacts" && (
        <>
          {/* Top 10 bar */}
          {topContacts.length > 0 && (
            <div className="mb-4 rounded-xl border border-border bg-background-raised p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                Most Active Contacts
              </h3>
              <BarList items={topContacts} valueLabel="interactions" />
            </div>
          )}

          <div className="mb-4">
            <SearchInput
              value={search}
              onChange={handleSearch}
              placeholder="Search contacts…"
              count={search ? filtered.length : undefined}
            />
          </div>

          <DataTable
            data={pageData}
            columns={[
              {
                key: "contact",
                label: "Contact",
                render: (c) => contactLabel(c),
                sortable: true,
                sortValue: (c) => c.screenName ?? c.accountId,
              },
              {
                key: "relationship",
                label: "Relationship",
                render: (c) => {
                  const badge = RELATIONSHIP_BADGE[c.relationship];
                  return (
                    <PillBadge variant={badge.variant}>{badge.label}</PillBadge>
                  );
                },
                sortable: true,
                sortValue: (c) => c.relationship,
              },
              {
                key: "mentions",
                label: "Mentions",
                render: (c) => formatNumber(c.mentionCount),
                sortable: true,
                sortValue: (c) => c.mentionCount,
                align: "right" as const,
                mono: true,
              },
              {
                key: "replies",
                label: "Replies",
                render: (c) => formatNumber(c.replyCount),
                sortable: true,
                sortValue: (c) => c.replyCount,
                align: "right" as const,
                mono: true,
              },
              {
                key: "dms",
                label: "DMs",
                render: (c) =>
                  formatNumber(c.dmSent + c.dmReceived),
                sortable: true,
                sortValue: (c) => c.dmSent + c.dmReceived,
                align: "right" as const,
                mono: true,
              },
              {
                key: "total",
                label: "Total",
                render: (c) => formatNumber(c.totalInteractions),
                sortable: true,
                sortValue: (c) => c.totalInteractions,
                align: "right" as const,
                mono: true,
              },
            ]}
            emptyMessage="No contacts found."
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {/* By Channel tab */}
      {tab === "channels" && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-background-raised p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                Public (Mentions & Replies)
              </h3>
              {topPublic.length > 0 ? (
                <BarList items={topPublic} valueLabel="interactions" />
              ) : (
                <p className="text-sm text-foreground-muted">
                  No public interactions found.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-background-raised p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                Private (Direct Messages)
              </h3>
              {topPrivate.length > 0 ? (
                <BarList items={topPrivate} valueLabel="messages" />
              ) : (
                <p className="text-sm text-foreground-muted">
                  No DM interactions found.
                </p>
              )}
            </div>
          </div>

          {stats.bothChannelsContacts > 0 && (
            <div className="rounded-xl border border-border bg-background-raised p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                Both Public & Private
              </h3>
              <p className="mb-3 text-sm text-foreground-muted">
                You both DM and publicly mention{" "}
                {pluralize(stats.bothChannelsContacts, "contact")}.
              </p>
              <div className="flex flex-wrap gap-2">
                {contacts
                  .filter(
                    (c) =>
                      c.publicInteractions > 0 && c.privateInteractions > 0,
                  )
                  .slice(0, 20)
                  .map((c) => (
                    <PillBadge key={c.accountId} variant="accent">
                      {contactLabel(c)}
                    </PillBadge>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Relationships tab */}
      {tab === "relationships" && (
        <>
          {/* Insight callouts */}
          {(stats.dmWithStrangers > 0 || stats.replyToNonFollowers > 0) && (
            <div className="mb-4 space-y-3">
              {stats.dmWithStrangers > 0 && (
                <div className="rounded-xl border border-danger/20 bg-danger/5 p-5">
                  <p className="text-sm font-medium text-danger">
                    You DM{" "}
                    <span className="font-bold">
                      {pluralize(stats.dmWithStrangers, "person", "people")}
                    </span>{" "}
                    you have no follow relationship with.
                  </p>
                </div>
              )}
              {stats.replyToNonFollowers > 0 && (
                <div className="rounded-xl border border-danger/20 bg-danger/5 p-5">
                  <p className="text-sm font-medium text-danger">
                    You reply to{" "}
                    <span className="font-bold">
                      {pluralize(stats.replyToNonFollowers, "account")}
                    </span>{" "}
                    that don&apos;t follow you back.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Stat cards per relationship */}
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {(
              [
                "mutual",
                "following-only",
                "follower-only",
                "blocked",
                "none",
              ] as const
            ).map((type) => (
              <StatCard
                key={type}
                label={RELATIONSHIP_BADGE[type].label}
                value={stats.contactsByRelationship[type]}
              />
            ))}
          </div>

          {/* BarLists per relationship */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {(["mutual", "following-only", "follower-only", "none"] as const).map(
              (type) => {
                const items = byRelationship(type);
                if (items.length === 0) return null;
                return (
                  <div
                    key={type}
                    className="rounded-xl border border-border bg-background-raised p-5"
                  >
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                      {RELATIONSHIP_BADGE[type].label} Contacts
                    </h3>
                    <BarList items={items} valueLabel="interactions" />
                  </div>
                );
              },
            )}
          </div>
        </>
      )}
    </div>
  );
}
