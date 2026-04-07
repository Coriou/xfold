"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const BUTTON_BASE =
  "inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg px-3 text-sm text-foreground-muted transition-colors hover:bg-background-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-30";

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-1.5 py-4 sm:gap-2"
      aria-label="Pagination"
    >
      <button
        type="button"
        onClick={() => onPageChange(0)}
        disabled={page === 0}
        aria-label="First page"
        title="First page"
        className={BUTTON_BASE}
      >
        <span className="sm:hidden" aria-hidden="true">
          «
        </span>
        <span className="hidden sm:inline">First</span>
      </button>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        aria-label="Previous page"
        title="Previous page"
        className={BUTTON_BASE}
      >
        <span className="sm:hidden" aria-hidden="true">
          ‹
        </span>
        <span className="hidden sm:inline">Prev</span>
      </button>
      <span
        className="min-h-[40px] px-2 inline-flex items-center text-sm text-foreground-muted"
        aria-current="page"
        aria-live="polite"
      >
        <span className="font-mono text-foreground">{page + 1}</span>
        {" / "}
        <span className="font-mono">{totalPages}</span>
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        aria-label="Next page"
        title="Next page"
        className={BUTTON_BASE}
      >
        <span className="sm:hidden" aria-hidden="true">
          ›
        </span>
        <span className="hidden sm:inline">Next</span>
      </button>
      <button
        type="button"
        onClick={() => onPageChange(totalPages - 1)}
        disabled={page >= totalPages - 1}
        aria-label="Last page"
        title="Last page"
        className={BUTTON_BASE}
      >
        <span className="sm:hidden" aria-hidden="true">
          »
        </span>
        <span className="hidden sm:inline">Last</span>
      </button>
    </nav>
  );
}
