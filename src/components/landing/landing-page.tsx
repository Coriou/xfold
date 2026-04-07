"use client";

import { useArchive } from "@/lib/archive/archive-store";
import { UploadZone } from "./upload-zone";
import { ProgressBar } from "@/components/shared/progress-bar";

export function LandingPage() {
  const { state, loadArchive, cancelParse, reset } = useArchive();
  const isLoading = state.status === "loading";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="flex w-full max-w-lg flex-col items-center text-center">
        {/* Logo / wordmark */}
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          x<span className="text-accent">fold</span>
        </h1>
        <p className="mb-10 text-lg text-foreground-muted sm:text-xl">
          See what X knows about you
        </p>

        {/* Upload or progress */}
        {isLoading ? (
          <div className="flex w-full max-w-lg flex-col items-center gap-4">
            <ProgressBar progress={state.progress} />
            <button
              type="button"
              onClick={cancelParse}
              className="text-xs text-foreground-muted underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              Cancel
            </button>
          </div>
        ) : (
          <UploadZone onFile={loadArchive} disabled={isLoading} />
        )}

        {/* Error state */}
        {state.status === "error" && (
          <div className="mt-6 max-w-lg rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-left text-sm text-danger">
            <p className="font-medium">
              {state.code === "not-an-archive"
                ? "We couldn't open this file as a ZIP."
                : state.code === "not-an-x-archive"
                  ? "This doesn't look like an X archive."
                  : state.code === "corrupt"
                    ? "The archive appears to be corrupted."
                    : "Something went wrong."}
            </p>
            <p className="mt-1 text-xs opacity-90">{state.message}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-3 text-xs underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger rounded"
            >
              Try a different file
            </button>
          </div>
        )}

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-foreground-muted">
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            100% client-side
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Open source
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            No tracking
          </span>
        </div>
      </div>
    </div>
  );
}
