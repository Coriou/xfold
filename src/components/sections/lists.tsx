"use client";

import { useMemo } from "react";
import type { ParsedArchive, ListInfo } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { safeHref } from "@/lib/safe-href";

function parseListUrl(url: string): {
  display: string;
  username?: string;
} {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const [user, kind, slug] = parts;
    // /i/lists/12345
    if (user === "i" && kind === "lists") {
      return { display: `List #${slug ?? ""}` };
    }
    // /username/lists/slug
    if (user !== undefined && kind === "lists" && slug !== undefined) {
      return {
        display: slug.replace(/-/g, " "),
        username: user,
      };
    }
    return { display: url };
  } catch {
    return { display: url };
  }
}

export default function Lists({ archive }: { archive: ParsedArchive }) {
  const grouped = useMemo(() => {
    const created = archive.lists.filter((l) => l.type === "created");
    const member = archive.lists.filter((l) => l.type === "member");
    const subscribed = archive.lists.filter((l) => l.type === "subscribed");
    return { created, member, subscribed };
  }, [archive.lists]);

  const total = archive.lists.length;

  return (
    <div>
      <SectionHeader
        title="Lists"
        description={
          total > 0
            ? `${total} ${total === 1 ? "list" : "lists"} in your archive.`
            : "No lists found in your archive."
        }
        badge={total > 0 ? String(total) : undefined}
      />

      {total === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-muted">
          No list data found in your archive.
        </p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard
              label="Created"
              value={grouped.created.length}
              variant="accent"
            />
            <StatCard label="Member Of" value={grouped.member.length} />
            <StatCard
              label="Subscribed To"
              value={grouped.subscribed.length}
            />
          </div>

          {grouped.created.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                Created by You
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {grouped.created.map((list, i) => (
                  <ListLink key={i} list={list} />
                ))}
              </div>
            </div>
          )}

          {grouped.member.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                Member Of
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {grouped.member.map((list, i) => (
                  <ListLink key={i} list={list} />
                ))}
              </div>
            </div>
          )}

          {grouped.subscribed.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground-muted">
                Subscribed To
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {grouped.subscribed.map((list, i) => (
                  <ListLink key={i} list={list} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ListLink({ list }: { list: ListInfo }) {
  const parsed = parseListUrl(list.url);
  const safe = safeHref(list.url);
  const className =
    "flex items-center justify-between rounded-xl border border-border bg-background-raised p-4 transition-colors hover:border-border-hover";

  const content = (
    <>
      <div>
        <p className="text-sm font-medium text-foreground">{parsed.display}</p>
        {parsed.username && (
          <p className="mt-0.5 text-xs text-foreground-muted">
            by @{parsed.username}
          </p>
        )}
      </div>
      {safe && <span className="text-xs text-accent">Open</span>}
    </>
  );

  return safe ? (
    <a href={safe} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}
