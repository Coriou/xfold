"use client";

import { useArchive } from "@/lib/archive/archive-store";

/**
 * Dismissible banner shown at the top of the dashboard when some files in
 * the archive failed to parse. Lets the user know they're looking at
 * partial data instead of silently hiding the failure.
 */
export function ParseWarningsBanner() {
  const { state, dismissWarnings } = useArchive();

  if (state.status !== "ready" || !state.failedFiles?.length) {
    return null;
  }

  const count = state.failedFiles.length;
  const preview = state.failedFiles.slice(0, 5).join(", ");
  const more = count > 5 ? `, +${count - 5} more` : "";

  return (
    <div
      role="status"
      className="border-b border-danger/30 bg-danger/10 px-4 py-2.5 text-sm text-danger"
    >
      <div className="mx-auto flex max-w-6xl items-start gap-3">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0"
          aria-hidden="true"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div className="flex-1">
          <p className="font-medium">
            {count} file{count === 1 ? "" : "s"} couldn&rsquo;t be parsed.
          </p>
          <p className="mt-0.5 text-xs opacity-80">
            You&rsquo;re viewing partial data. Affected: {preview}
            {more}
          </p>
        </div>
        <button
          type="button"
          onClick={dismissWarnings}
          aria-label="Dismiss warning"
          className="rounded p-0.5 text-danger/80 transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
