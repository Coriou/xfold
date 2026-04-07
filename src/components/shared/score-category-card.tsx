"use client";

import type { CategoryScore } from "@/lib/privacy-score";
import { formatNumber } from "@/lib/format";

interface ScoreCategoryCardProps {
  category: CategoryScore;
}

export function ScoreCategoryCard({ category }: ScoreCategoryCardProps) {
  const barColor =
    category.score <= 30
      ? "bg-accent"
      : category.score <= 60
        ? "bg-foreground"
        : "bg-danger";

  const gradeColor =
    category.score <= 30
      ? "bg-accent/10 text-accent"
      : category.score <= 60
        ? "bg-foreground/10 text-foreground"
        : "bg-danger/10 text-danger";

  return (
    <div className="rounded-xl border border-border bg-background-raised p-5">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {category.label}
        </h3>
        <span
          className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${gradeColor}`}
        >
          {category.grade}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-foreground/5">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${category.score}%` }}
        />
      </div>

      {/* Metrics */}
      <ul className="space-y-2">
        {category.metrics.map((metric, i) => {
          const valueColor =
            metric.severity === "high"
              ? "text-danger"
              : metric.severity === "medium"
                ? "text-foreground"
                : "text-foreground-muted";

          return (
            <li key={i} className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-foreground-muted">
                {metric.label}
              </span>
              <div className="text-right">
                <span className={`font-mono text-sm font-medium ${valueColor}`}>
                  {typeof metric.value === "number"
                    ? formatNumber(metric.value)
                    : metric.value}
                </span>
                {metric.detail && (
                  <span className="ml-1.5 text-xs text-foreground-muted">
                    {metric.detail}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
