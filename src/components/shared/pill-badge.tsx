"use client";

import type { ReactNode } from "react";

const VARIANTS = {
  default: "bg-foreground/10 text-foreground",
  accent: "bg-accent/15 text-accent",
  danger: "bg-danger/15 text-danger",
  muted: "bg-foreground/5 text-foreground-muted",
} as const;

interface PillBadgeProps {
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
}

export function PillBadge({ children, variant = "default" }: PillBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  );
}
