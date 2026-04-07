"use client";

import { useEffect, useState } from "react";

/**
 * Debounce a rapidly-changing value (e.g. a search input) by `delayMs`.
 *
 * Returns the most recent value the source has held still for `delayMs`.
 * Use it to gate expensive memoized work like full-archive filters so we
 * don't re-filter on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
