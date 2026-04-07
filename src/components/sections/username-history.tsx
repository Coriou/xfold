"use client";

import type { ParsedArchive } from "@/lib/archive/types";
import { SectionHeader } from "@/components/shared/section-header";
import { formatDate, pluralize } from "@/lib/format";

export default function UsernameHistory({
  archive,
}: {
  archive: ParsedArchive;
}) {
  const changes = [...archive.screenNameChanges].sort((a, b) =>
    b.changedAt.localeCompare(a.changedAt),
  );

  return (
    <div>
      <SectionHeader
        title="Username History"
        description={
          changes.length > 0
            ? `${pluralize(changes.length, "username change")} recorded.`
            : "No username changes found in your archive."
        }
        badge={changes.length > 0 ? String(changes.length) : undefined}
      />

      {changes.length > 0 && (
        <div className="relative ml-4 border-l-2 border-border pl-6">
          {changes.map((change, i) => (
            <div key={i} className="relative mb-8 last:mb-0">
              {/* Dot on timeline */}
              <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-accent bg-background" />

              <p className="text-xs text-foreground-muted">
                {formatDate(change.changedAt)}
              </p>
              <div className="mt-1.5 flex items-center gap-2 text-sm">
                <span className="font-mono text-foreground-muted line-through">
                  @{change.changedFrom}
                </span>
                <span className="text-foreground-muted">&rarr;</span>
                <span className="font-mono font-medium text-foreground">
                  @{change.changedTo}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
