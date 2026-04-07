"use client";

import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

/**
 * Consistent "no data" placeholder used across sections that may be empty
 * for some users (e.g. no DMs, no connected apps, no Grok conversations).
 */
export function EmptyState({
  title,
  description,
  icon,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-border bg-background-raised px-6 py-12 text-center ${className}`}
    >
      {icon && (
        <div className="mb-3 text-foreground-muted/60" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-base font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-foreground-muted">
          {description}
        </p>
      )}
    </div>
  );
}
