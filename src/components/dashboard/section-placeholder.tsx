"use client";

import { NAV_SECTIONS } from "@/lib/archive/constants";

export function SectionPlaceholder({ sectionId }: { sectionId: string }) {
  const label =
    NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.id === sectionId)
      ?.label ?? sectionId;

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="rounded-xl border border-border bg-background-raised px-8 py-10">
        <h2 className="text-xl font-semibold text-foreground">{label}</h2>
        <p className="mt-2 text-sm text-foreground-muted">
          Coming soon
        </p>
      </div>
    </div>
  );
}
