"use client";

import type { ReactNode } from "react";

const VARIANTS = {
  default: "text-foreground",
  danger: "text-danger bg-danger/5",
  accent: "text-accent bg-accent/5",
} as const;

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string | undefined;
  variant?: keyof typeof VARIANTS | undefined;
  icon?: ReactNode | undefined;
}

export function StatCard({
  label,
  value,
  subtitle,
  variant = "default",
  icon,
}: StatCardProps) {
  return (
    <div
      className={`rounded-xl border border-border p-4 ${VARIANTS[variant]}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
          {label}
        </p>
        {icon && (
          <span className="text-foreground-muted">{icon}</span>
        )}
      </div>
      <p className="mt-2 font-mono text-2xl font-bold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-foreground-muted">{subtitle}</p>
      )}
    </div>
  );
}
