// ---------------------------------------------------------------------------
// Safe URL handling for hrefs
// ---------------------------------------------------------------------------
// User archives can contain arbitrary URLs (profile websites, tweet entity
// URLs, organization URLs, etc.). These are user-controlled data and may
// contain `javascript:`, `data:`, or `vbscript:` schemes that would execute
// when clicked, even with `target="_blank" rel="noopener noreferrer"`.
//
// Always run user-controlled URLs through `safeHref` before passing them
// to an `href` attribute.
// ---------------------------------------------------------------------------

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

/**
 * Returns the URL if it parses and uses an allowed scheme, otherwise null.
 *
 * - Relative URLs are rejected (we never want them in archive content).
 * - Only http(s) and mailto are allowed by default.
 * - Untrusted strings that fail to parse return null.
 */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    // Use a base so relative URLs don't accidentally resolve. We then check
    // that the parsed origin is NOT the dummy base — if it is, the input was
    // relative and we reject it.
    const dummyBase = "https://__xfold_invalid__.example/";
    const parsed = new URL(trimmed, dummyBase);

    // Reject anything that resolved against the dummy base (relative URL).
    if (parsed.origin === "https://__xfold_invalid__.example") return null;

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;

    return parsed.toString();
  } catch {
    return null;
  }
}
