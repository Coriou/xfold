"use client";

import { useId } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: ((value: string) => void) | undefined;
  placeholder?: string | undefined;
  count?: number | undefined;
  label?: string | undefined;
}

export function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Search…",
  count,
  label = "Search",
}: SearchInputProps) {
  const id = useId();

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <svg
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onSubmit?.(value);
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background-raised py-2 pl-9 pr-24 text-sm text-foreground placeholder:text-foreground-muted/50 transition-colors focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      />
      {count !== undefined && (
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-muted"
          aria-live="polite"
        >
          {count.toLocaleString()} results
        </span>
      )}
    </div>
  );
}
