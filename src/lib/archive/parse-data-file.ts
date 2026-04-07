// ---------------------------------------------------------------------------
// Parse a single .js data file from the X/Twitter archive
// ---------------------------------------------------------------------------
// Each file looks like: window.YTD.tweets.part0 = [{...}, ...]
// Exception: manifest.js uses window.__THAR_CONFIG = {...}
// ---------------------------------------------------------------------------

const YTD_PREFIX = /^window\.(?:YTD\.([\w]+)\.part\d+|__THAR_CONFIG)\s*=\s*/;

export interface DataFileResult {
  /** YTD key name (e.g. "tweets", "like") or "__manifest" for manifest.js */
  name: string;
  /** The parsed JSON — array for YTD files, object for manifest */
  data: unknown;
}

export function parseDataFile(
  filename: string,
  content: string,
): DataFileResult {
  const trimmed = content.trim().replace(/;\s*$/, "");
  const match = trimmed.match(YTD_PREFIX);

  if (!match) {
    throw new Error(`Unrecognized format in ${filename}`);
  }

  const jsonStr = trimmed.slice(match[0].length);
  const name = match[1] ?? "__manifest";

  try {
    return { name, data: JSON.parse(jsonStr) };
  } catch {
    throw new Error(`Invalid JSON in ${filename}`);
  }
}
