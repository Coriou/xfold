import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-2 text-4xl font-bold tracking-tight text-foreground">
        x<span className="text-accent">fold</span>
      </h1>
      <p className="mb-2 text-6xl font-bold text-foreground-muted">404</p>
      <p className="mb-8 text-foreground-muted">
        There&apos;s only one page and this isn&apos;t it.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-hover"
      >
        Go home
      </Link>
    </div>
  );
}
