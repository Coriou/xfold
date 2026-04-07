"use client";

export interface TimelineSegment {
  source: string;
  count: number;
}

export interface TimelineBucket {
  label: string;
  segments: TimelineSegment[];
}

interface StackedBarTimelineProps {
  buckets: TimelineBucket[];
  sourceColors: Record<string, string>;
}

export function StackedBarTimeline({
  buckets,
  sourceColors,
}: StackedBarTimelineProps) {
  if (buckets.length === 0) return null;

  const maxTotal = Math.max(
    ...buckets.map((b) => b.segments.reduce((s, seg) => s + seg.count, 0)),
    1,
  );

  // Determine label density to avoid crowding
  const showEvery = buckets.length > 24 ? Math.ceil(buckets.length / 24) : 1;

  return (
    <div className="overflow-x-auto">
      <div
        className="flex items-end gap-[2px]"
        style={{ minWidth: `${Math.max(buckets.length * 1.25, 20)}rem`, height: "10rem" }}
      >
        {buckets.map((bucket, i) => {
          const total = bucket.segments.reduce((s, seg) => s + seg.count, 0);
          const barHeight = (total / maxTotal) * 100;

          return (
            <div key={bucket.label} className="flex min-w-0 flex-1 flex-col items-center">
              {/* Bar */}
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-t-sm"
                style={{ height: `${barHeight}%` }}
                title={`${bucket.label}: ${total} events`}
              >
                {bucket.segments.map((seg) => {
                  if (seg.count === 0) return null;
                  const segPct = (seg.count / total) * 100;
                  return (
                    <div
                      key={seg.source}
                      style={{
                        height: `${segPct}%`,
                        backgroundColor: sourceColors[seg.source] ?? "var(--foreground-muted)",
                      }}
                      title={`${seg.source}: ${seg.count}`}
                    />
                  );
                })}
              </div>

              {/* Label */}
              <div className="mt-1 w-full text-center">
                <span
                  className="text-[9px] text-foreground-muted"
                  style={{
                    visibility: i % showEvery === 0 ? "visible" : "hidden",
                  }}
                >
                  {bucket.label.slice(2)} {/* drop "20" prefix for brevity */}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
