"use client";

import { useState, useMemo, type ReactNode } from "react";

export interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => ReactNode;
  sortable?: boolean;
  sortValue?: (item: T) => string | number;
  mono?: boolean;
  align?: "left" | "right";
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
}

export function DataTable<T>({
  data,
  columns,
  emptyMessage = "No data",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;

    const getValue = col.sortValue;
    return [...data].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, columns, sortKey, sortDir]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-foreground-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    // Wrapper provides a horizontal scroll affordance shadow on small screens
    // so users notice when columns extend beyond the visible area.
    <div className="relative rounded-xl border border-border">
      <div className="overflow-x-auto rounded-xl [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] sm:[mask-image:none]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background-overlay">
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const ariaSort: "ascending" | "descending" | "none" = isSorted
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={col.sortable ? ariaSort : undefined}
                    className={`px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted sm:px-4 sm:py-2.5 ${
                      col.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="inline-flex items-center gap-1 rounded select-none transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {col.label}
                        {isSorted && (
                          <SortIcon
                            direction={sortDir}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((item, i) => (
              <tr
                key={i}
                className="transition-colors hover:bg-background-raised/50"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-2.5 py-2 sm:px-4 sm:py-2.5 ${
                      col.mono ? "font-mono text-xs" : ""
                    } ${col.align === "right" ? "text-right" : ""}`}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortIcon({
  direction,
  ...rest
}: { direction: "asc" | "desc" } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
      {...rest}
    >
      {direction === "asc" ? (
        <polyline points="18 15 12 9 6 15" />
      ) : (
        <polyline points="6 9 12 15 18 9" />
      )}
    </svg>
  );
}
