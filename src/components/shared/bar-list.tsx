"use client";

interface BarListItem {
  label: string;
  value: number;
  subLabel?: string;
}

interface BarListProps {
  items: BarListItem[];
  maxItems?: number;
  valueLabel?: string;
}

export function BarList({ items, maxItems = 10, valueLabel }: BarListProps) {
  const visible = items.slice(0, maxItems);
  const max = Math.max(...visible.map((i) => i.value), 1);

  return (
    <div className="space-y-2">
      {visible.map((item, i) => (
        <div key={i} className="group flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-foreground">
                {item.label}
              </span>
              <span className="shrink-0 font-mono text-xs text-foreground-muted">
                {item.value.toLocaleString()}
                {valueLabel ? ` ${valueLabel}` : ""}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-accent/10">
              <div
                className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
            {item.subLabel && (
              <p className="mt-0.5 text-xs text-foreground-muted">
                {item.subLabel}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
