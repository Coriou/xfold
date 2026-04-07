"use client";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-2 text-4xl font-bold tracking-tight text-foreground">
        x<span className="text-accent">fold</span>
      </h1>
      <h2 className="mb-4 text-lg text-foreground-muted">
        Something went wrong
      </h2>
      <p className="mb-8 max-w-md rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 font-mono text-sm text-danger">
        {error.message || "An unexpected error occurred"}
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => unstable_retry()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-hover"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border border-border px-4 py-2 text-sm text-foreground-muted transition-colors hover:bg-background-raised hover:text-foreground"
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
