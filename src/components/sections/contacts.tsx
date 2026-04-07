"use client";

import { useMemo, useState } from "react";
import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";

const PAGE_SIZE = 50;

export default function Contacts({ archive }: { archive: ParsedArchive }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const contacts = archive.contacts;

  const stats = useMemo(() => {
    let emailCount = 0;
    let phoneCount = 0;
    for (const c of contacts) {
      emailCount += c.emails.length;
      phoneCount += c.phoneNumbers.length;
    }
    return { emailCount, phoneCount };
  }, [contacts]);

  const filtered = useMemo(() => {
    if (!search) return contacts;
    const lower = search.toLowerCase();
    return contacts.filter((c) => {
      const name = [c.firstName, c.lastName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        name.includes(lower) ||
        c.emails.some((e) => e.toLowerCase().includes(lower)) ||
        c.phoneNumbers.some((p) => p.includes(lower))
      );
    });
  }, [contacts, search]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (contacts.length === 0) {
    return (
      <div>
        <SectionHeader
          title="Uploaded Contacts"
          description="Your phone's address book, uploaded to X."
        />
        <EmptyState
          title="No uploaded contacts found"
          description="Your archive doesn't contain contact data. This likely means you never synced your address book with X/Twitter."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Uploaded Contacts"
        description="X asked to sync your address book. Here's what they kept."
        badge={`${contacts.length.toLocaleString()} contacts`}
      />

      {/* Warning callout */}
      <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 p-4">
        <p className="text-sm font-semibold text-danger">
          You gave X {contacts.length.toLocaleString()} contacts from your
          phone.
        </p>
        <p className="mt-1.5 text-xs text-foreground-muted">
          This includes {stats.emailCount.toLocaleString()} email addresses and{" "}
          {stats.phoneCount.toLocaleString()} phone numbers — from people who
          never consented to X having their data. These contacts are used to
          suggest &ldquo;people you may know&rdquo; and to build your social
          graph.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Contacts uploaded"
          value={contacts.length}
          variant="danger"
        />
        <StatCard label="Email addresses" value={stats.emailCount} />
        <StatCard label="Phone numbers" value={stats.phoneCount} />
      </div>

      {/* Search */}
      <div className="mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search contacts..."
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {paged.map((contact) => {
          const name = [contact.firstName, contact.lastName]
            .filter(Boolean)
            .join(" ");
          return (
            <div
              key={contact.id}
              className="flex flex-col gap-1 rounded-xl border border-border bg-background-raised p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                {name ? (
                  <p className="truncate text-sm font-medium text-foreground">
                    {name}
                  </p>
                ) : (
                  <p className="text-sm italic text-foreground-muted">
                    Unnamed contact
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-foreground-muted">
                {contact.emails.map((email) => (
                  <span
                    key={email}
                    className="rounded bg-foreground/10 px-1.5 py-0.5"
                  >
                    {email}
                  </span>
                ))}
                {contact.phoneNumbers.map((phone) => (
                  <span
                    key={phone}
                    className="rounded bg-foreground/10 px-1.5 py-0.5"
                  >
                    {phone}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={Math.ceil(filtered.length / PAGE_SIZE)}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
