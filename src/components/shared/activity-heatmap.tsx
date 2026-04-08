"use client";

import { Fragment } from "react";
import { getDayLabel, formatHour } from "@/lib/format";
import { accentAlpha, neutralOklchFaint } from "@/lib/brand";

export interface HeatmapCell {
  day: number; // 0 (Sun) through 6 (Sat)
  hour: number; // 0 through 23
  count: number;
}

interface ActivityHeatmapProps {
  data: HeatmapCell[];
}

const OPACITY_LEVELS = [0.1, 0.25, 0.5, 0.75, 1.0];

function quantize(normalized: number): number {
  if (normalized <= 0) return 0;
  for (const level of OPACITY_LEVELS) {
    if (normalized <= level) return level;
  }
  return 1.0;
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // Build 7x24 grid, pre-filled with zeros
  const grid: number[][] = Array.from({ length: 7 }, () =>
    Array<number>(24).fill(0),
  );
  for (const cell of data) {
    if (cell.day >= 0 && cell.day < 7 && cell.hour >= 0 && cell.hour < 24) {
      const row = grid[cell.day];
      if (row) row[cell.hour] = cell.count;
    }
  }

  const max = Math.max(...data.map((c) => c.count), 1);

  // Show hours every 3rd
  const hourLabels = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div>
      <div className="overflow-x-auto">
        <div
          className="inline-grid gap-[3px]"
          style={{
            gridTemplateColumns: `3rem repeat(24, minmax(1.25rem, 1fr))`,
            gridTemplateRows: `1.25rem repeat(7, minmax(1.25rem, 1fr))`,
            minWidth: "36rem",
          }}
        >
          {/* Top-left empty corner */}
          <div />

          {/* Hour labels */}
          {hourLabels.map((h) => (
            <div
              key={`h-${h}`}
              className="flex items-end justify-center text-[10px] text-foreground-muted"
            >
              {h % 3 === 0 ? formatHour(h) : ""}
            </div>
          ))}

          {/* Day rows */}
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <Fragment key={day}>
              <div className="flex items-center pr-2 text-xs text-foreground-muted">
                {getDayLabel(day)}
              </div>
              {Array.from({ length: 24 }, (_, hour) => {
                const count = grid[day]?.[hour] ?? 0;
                const normalized = count / max;
                const opacity = quantize(normalized);

                return (
                  <div
                    key={hour}
                    className="rounded-sm"
                    style={{
                      backgroundColor:
                        count === 0 ? neutralOklchFaint : accentAlpha(opacity),
                    }}
                    title={`${getDayLabel(day, true)} ${formatHour(hour)}: ${count} ${count === 1 ? "event" : "events"}`}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-foreground-muted">
        <span>Less</span>
        <div
          className="h-3 w-3 rounded-sm"
          style={{ backgroundColor: neutralOklchFaint }}
        />
        {OPACITY_LEVELS.map((op) => (
          <div
            key={op}
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: accentAlpha(op) }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
