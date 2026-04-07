"use client";

import type { ProgressUpdate } from "@/lib/archive/worker-protocol";

export function ProgressBar({ progress }: { progress: ProgressUpdate }) {
  return (
    <div
      className="w-full max-w-md space-y-3"
      role="progressbar"
      aria-valuenow={progress.percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Parsing archive"
    >
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
          style={{ width: `${Math.max(progress.percent, 2)}%` }}
        />
      </div>
      <div className="space-y-0.5">
        <p className="text-sm text-foreground-muted">{progress.message}</p>
        {progress.currentFile && (
          <p
            className="truncate font-mono text-xs text-foreground-muted/70"
            title={progress.currentFile}
          >
            {progress.currentFile}
          </p>
        )}
      </div>
    </div>
  );
}
