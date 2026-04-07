"use client";

import {
  unstable_catchError as catchError,
  type ErrorInfo,
} from "next/error";
import type { ReactNode } from "react";

function Fallback(
  _props: { sectionId: string; children: ReactNode },
  { error, unstable_retry }: ErrorInfo,
) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="w-full max-w-md rounded-xl border border-danger/20 bg-danger/5 p-6 text-center">
        <div className="mb-3 text-2xl">!</div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          This section failed to load
        </h3>
        <p className="mb-4 font-mono text-xs text-foreground-muted">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={() => unstable_retry()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-hover"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default catchError(Fallback);
