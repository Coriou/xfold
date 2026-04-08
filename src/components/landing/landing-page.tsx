"use client";

import { useEffect, useState } from "react";
import { useArchive } from "@/lib/archive/archive-store";
import { UploadZone } from "./upload-zone";
import { ProgressBar } from "@/components/shared/progress-bar";
import { FAQ } from "@/lib/faq";
import {
  clearArchive as idbClearArchive,
  getCacheMetadata,
} from "@/lib/archive/idb-cache";

const REPO_URL = "https://github.com/Coriou/xfold";
const ARCHIVE_DOWNLOAD_URL = "https://x.com/settings/download_your_data";

interface FeatureBlurb {
  readonly title: string;
  readonly body: string;
}

const FEATURES: readonly FeatureBlurb[] = [
  {
    title: "Privacy score",
    body: "A single number rolled up from across the whole archive — interests, ad targeting, devices, third-party access.",
  },
  {
    title: "Top findings",
    body: "The dozen most concerning facts about your data, ranked from worst to merely uncomfortable.",
  },
  {
    title: "Ad price tag",
    body: "Estimated dollars X earned from showing you ads, with the biggest spender called out by name.",
  },
  {
    title: "Login history",
    body: "Every IP, every browser, every device fingerprint X recorded — geolocated and grouped by session.",
  },
  {
    title: "Connected apps",
    body: "Third-party services with access to your account, including the ones you authorised in 2014 and forgot about.",
  },
  {
    title: "Grok conversations",
    body: "Your full chat history with X's AI, indexed and searchable. Yes, X kept it all.",
  },
  {
    title: "Deleted tweets",
    body: "Yes, X kept them. With dates, full text, and the original engagement counts.",
  },
  {
    title: "Shadow profile",
    body: "The things X inferred about you that you never told it — demographics, lookalike audiences, ad categories.",
  },
];

export function LandingPage() {
  const { state, loadArchive, loadDemoArchive, cancelParse, reset } =
    useArchive();
  const isLoading = state.status === "loading";
  const [hasCachedArchive, setHasCachedArchive] = useState(false);

  // On mount, check if there's a cached archive in IDB. We expose a "clear
  // cache" affordance only when there is one — otherwise the link is noise.
  // This is the recovery path for someone who landed on the upload zone
  // because their cache was slow to restore and just wants to wipe IDB
  // without entering the dashboard.
  useEffect(() => {
    void getCacheMetadata().then((meta) => {
      if (meta) setHasCachedArchive(true);
    });
  }, []);

  const handleClearCache = async () => {
    await idbClearArchive();
    setHasCachedArchive(false);
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Hero — fills the viewport on first load */}
      <section className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-lg flex-col items-center text-center">
          {/* Wordmark — visual only, no longer the document h1 */}
          <p
            aria-hidden="true"
            className="mb-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
          >
            x<span className="text-accent">fold</span>
          </p>
          <h1 className="mb-10 text-lg text-foreground-muted sm:text-xl">
            See what X knows about you
          </h1>

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
            <>
              <UploadZone onFile={loadArchive} disabled={isLoading} />
              {/* Demo mode — try the dashboard before downloading anything */}
              <button
                type="button"
                onClick={loadDemoArchive}
                className="mt-4 text-xs text-foreground-muted underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              >
                No archive yet? Try with sample data →
              </button>
            </>
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
                      : state.code === "zip-bomb"
                        ? "This archive is too large to process safely."
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
              <svg
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
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              100% client-side
            </span>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              <svg
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
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              Open source
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
            <span className="flex items-center gap-1.5">
              <svg
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
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              No tracking
            </span>
          </div>

          {/* Cache-clear affordance — only shown when an archive is cached.
              Recovery path for someone who landed on the upload screen and
              wants to wipe IDB without entering the dashboard. */}
          {hasCachedArchive && (
            <button
              type="button"
              onClick={() => void handleClearCache()}
              className="mt-6 text-[11px] text-foreground-muted underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              Clear cached archive from this device
            </button>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            How it works
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background-raised p-5">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                1. Download from X
              </h3>
              <p className="text-sm text-foreground-muted">
                Request your archive at{" "}
                <a
                  href={ARCHIVE_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline-offset-4 hover:underline"
                >
                  x.com/settings/download_your_data
                </a>
                . X will email you a download link in 24-48 hours.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background-raised p-5">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                2. Drop into xfold
              </h3>
              <p className="text-sm text-foreground-muted">
                Drag the ZIP onto the upload zone. xfold parses it inside a
                Web Worker, in your browser, with no upload step.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background-raised p-5">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                3. Explore your data
              </h3>
              <p className="text-sm text-foreground-muted">
                Thirty-plus dashboard sections covering ads, interests,
                devices, deleted tweets, Grok chats, and more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What you'll see */}
      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            What you&rsquo;ll see
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-background-raised p-4"
              >
                <h3 className="mb-1.5 text-sm font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="text-xs text-foreground-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
            Questions
          </h2>
          <div className="space-y-3">
            {FAQ.map((entry) => (
              <details
                key={entry.q}
                className="group rounded-xl border border-border bg-background-raised p-5 open:border-border-hover"
              >
                <summary className="cursor-pointer text-sm font-semibold text-foreground marker:hidden">
                  {entry.q}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
                  {entry.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
