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
        <div className="mb-3 text-2xl" aria-hidden="true">
          !
        </div>
        <h3 className="mb-2 text-base font-semibold text-foreground">
          Something went wrong rendering this section
        </h3>
        <p className="mb-4 text-sm text-foreground-muted">
          The other sections still work — try Retry, or pick another section
          from the sidebar. If it keeps happening, your archive may have an
          unexpected shape we haven&apos;t seen yet.
        </p>
        <button
          onClick={() => unstable_retry()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Retry
        </button>
        {error.message && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-xs text-foreground-muted hover:text-foreground">
              Technical details
            </summary>
            <p className="mt-2 break-words font-mono text-[11px] text-foreground-muted">
              {error.message}
            </p>
          </details>
        )}
      </div>
    </div>
  );
}

export default catchError(Fallback);
