// ---------------------------------------------------------------------------
// Archive parsing Web Worker
// ---------------------------------------------------------------------------
// Uses fflate's streaming Unzip class which processes entries one at a time.
// Data files (.js) are parsed into structured data.
//
// Media files are handled in two tiers:
//   1. Hot cache — the first chunk of media (up to MAX_MEDIA_CACHE_BYTES)
//      is decompressed during parse and held in memory for instant access.
//   2. Cold fallback — anything beyond the budget stays compressed in the
//      retained ZIP buffer and is lazily re-extracted on demand. This
//      caps the worker's RSS at "ZIP size + cache budget" instead of
//      "every media file fully decompressed at once", which used to OOM
//      on multi-GB archives on mobile.
// ---------------------------------------------------------------------------

import { Unzip, UnzipInflate, UnzipPassThrough, strFromU8 } from "fflate";
import { parseDataFile } from "./parse-data-file";
import { transformArchive } from "./transform";
import type {
  WorkerInMessage,
  WorkerOutMessage,
  ProgressUpdate,
  ParseErrorCode,
} from "./worker-protocol";

/** Hot cache budget: how much decompressed media we hold in RAM at once. */
const MAX_MEDIA_CACHE_BYTES = 256 * 1024 * 1024; // 256 MB

/**
 * Hard ceiling on total decompressed bytes a single archive may produce
 * during parse. Anything past this is treated as a decompression bomb and
 * the parse is aborted before the worker OOMs.
 */
const MAX_TOTAL_DECOMPRESSED_BYTES = 8 * 1024 * 1024 * 1024; // 8 GB

// Cache of decompressed media files (path -> bytes)
const mediaCache = new Map<string, Uint8Array>();
/** Running total of cached media bytes (so we can stay under the budget). */
let cachedMediaBytes = 0;
/** Paths we saw during parse but skipped caching for budget reasons. */
const coldMediaPaths = new Set<string>();
/** The retained ZIP buffer for lazy cold-path extraction. Cleared on cancel. */
let retainedZip: Uint8Array | null = null;
/**
 * True when the worker is operating on a buffer restored from IDB rather
 * than a freshly parsed archive. In this mode the hot cache and
 * `coldMediaPaths` set are empty (we never walked the central directory),
 * so `handleGetMedia` falls through to `lazyExtract` for every request.
 */
let bufferOnlyMode = false;

/** Set when the main thread sends CANCEL_PARSE. The parsing loop checks this. */
let cancelRequested = false;

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case "PARSE_ARCHIVE":
      cancelRequested = false;
      handleParse(msg.buffer);
      break;
    case "GET_MEDIA":
      handleGetMedia(msg.path, msg.requestId);
      break;
    case "CANCEL_PARSE":
      cancelRequested = true;
      break;
    case "INIT_FROM_BUFFER":
      handleInitFromBuffer(msg.buffer);
      break;
  }
};

// ---------------------------------------------------------------------------
// Helpers for combining chunks
// ---------------------------------------------------------------------------

function combineChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    combined.set(c, offset);
    offset += c.length;
  }
  return combined;
}

class CancelledError extends Error {
  constructor() {
    super("Parse cancelled");
    this.name = "CancelledError";
  }
}

class ArchiveError extends Error {
  code: ParseErrorCode;
  constructor(code: ParseErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ArchiveError";
  }
}

// ---------------------------------------------------------------------------
// Parse archive — single streaming pass extracts data + media
// ---------------------------------------------------------------------------

function handleParse(buffer: ArrayBuffer) {
  try {
    const zipData = new Uint8Array(buffer);
    const sizeMB = (zipData.byteLength / (1024 * 1024)).toFixed(1);
    progress("reading", 5, `Processing archive (${sizeMB} MB)...`);

    const dataFiles = new Map<string, Uint8Array>();
    let mediaCount = 0;
    let totalEntries = 0;
    /**
     * Running total of decompressed bytes seen so far across data files
     * and (cached + cold) media. Compared against MAX_TOTAL_DECOMPRESSED_BYTES
     * to abort decompression bombs before they OOM the worker.
     */
    let totalDecompressedBytes = 0;

    mediaCache.clear();
    cachedMediaBytes = 0;
    coldMediaPaths.clear();
    // Retain the original ZIP for lazy extraction of cold-cache media.
    // The previous implementation let this go out of scope after parse.
    retainedZip = zipData;
    bufferOnlyMode = false;

    const uz = new Unzip((file) => {
      totalEntries++;
      const name = file.name;
      const lower = name.toLowerCase();

      // Data file: decompress and store for parsing
      if (lower.startsWith("data/") && lower.endsWith(".js")) {
        const chunks: Uint8Array[] = [];
        file.ondata = (_err, chunk, final) => {
          chunks.push(chunk);
          totalDecompressedBytes += chunk.byteLength;
          if (totalDecompressedBytes > MAX_TOTAL_DECOMPRESSED_BYTES) {
            throw new ArchiveError(
              "zip-bomb",
              "Archive decompresses to more than 8 GB. Aborting.",
            );
          }
          if (final) dataFiles.set(name, combineChunks(chunks));
        };
        file.start();
        return;
      }

      // Media file: decompress and cache up to the hot-cache budget. Past
      // the budget, just record the path — we'll lazy-extract on demand.
      if (isMediaPath(lower)) {
        mediaCount++;
        if (cachedMediaBytes >= MAX_MEDIA_CACHE_BYTES) {
          coldMediaPaths.add(name);
          return;
        }
        const chunks: Uint8Array[] = [];
        file.ondata = (_err, chunk, final) => {
          chunks.push(chunk);
          totalDecompressedBytes += chunk.byteLength;
          if (totalDecompressedBytes > MAX_TOTAL_DECOMPRESSED_BYTES) {
            throw new ArchiveError(
              "zip-bomb",
              "Archive decompresses to more than 8 GB. Aborting.",
            );
          }
          if (final) {
            const combined = combineChunks(chunks);
            if (cachedMediaBytes + combined.byteLength <= MAX_MEDIA_CACHE_BYTES) {
              mediaCache.set(name, combined);
              cachedMediaBytes += combined.byteLength;
            } else {
              coldMediaPaths.add(name);
            }
          }
        };
        file.start();
        return;
      }

      // Everything else (assets/, HTML viewer, etc.): skip
    });

    uz.register(UnzipInflate);
    uz.register(UnzipPassThrough);

    // Feed data in chunks to avoid blowing the call stack
    const CHUNK = 65536;
    for (let i = 0; i < zipData.length; i += CHUNK) {
      if (cancelRequested) throw new CancelledError();
      const end = Math.min(i + CHUNK, zipData.length);
      uz.push(zipData.subarray(i, end), end === zipData.length);
    }

    if (totalEntries === 0) {
      throw new ArchiveError(
        "not-an-archive",
        "This file doesn't appear to be a valid ZIP archive.",
      );
    }
    if (dataFiles.size === 0) {
      throw new ArchiveError(
        "not-an-x-archive",
        "This ZIP doesn't look like an X archive — no data/*.js files found. Make sure you downloaded it from x.com/settings/download_your_data.",
      );
    }

    progress(
      "unzipping",
      30,
      `Found ${dataFiles.size} data files, ${mediaCount} media files (${totalEntries} total entries)`,
    );

    // Parse each .js file. Files of the same logical type ("tweets") may be
    // split across multiple parts (tweets.js, tweets-part1.js, ...) for very
    // large archives. We accumulate arrays under the same key so the
    // transform step sees one merged dataset per type.
    const raw: Record<string, unknown> = {};
    const failedFiles: string[] = [];
    let parsed = 0;

    for (const [path, bytes] of dataFiles) {
      if (cancelRequested) throw new CancelledError();

      const filename = path.split("/").pop() ?? path;
      progress(
        "parsing",
        30 + Math.round((parsed / dataFiles.size) * 45),
        `Parsing ${filename}...`,
        filename,
      );

      try {
        const content = strFromU8(bytes);
        const result = parseDataFile(filename, content);

        // Manifest is unique (single object); everything else is an array.
        if (result.name === "__manifest") {
          raw[result.name] = result.data;
        } else if (Array.isArray(result.data)) {
          const existing = raw[result.name];
          if (Array.isArray(existing)) {
            // Merge multi-part files into one array
            raw[result.name] = [...existing, ...result.data];
          } else {
            raw[result.name] = result.data;
          }
        } else {
          raw[result.name] = result.data;
        }
      } catch {
        // Only mark as missing if we don't already have data from another part
        if (!(filename.replace(".js", "") in raw)) {
          raw[filename.replace(".js", "")] = [];
        }
        failedFiles.push(filename);
      }

      parsed++;
    }

    // Sanity check: an X archive must have either a manifest or an account
    // file. If neither parsed, this is almost certainly not an X archive.
    if (!raw["__manifest"] && !raw["account"]) {
      throw new ArchiveError(
        "not-an-x-archive",
        "This doesn't look like an X archive — no manifest.js or account.js could be parsed. Make sure you downloaded it from x.com/settings/download_your_data.",
      );
    }

    progress("parsing", 75, `Parsed ${parsed} files`);

    // Transform to typed data
    progress("structuring", 80, "Structuring data...");
    const archive = transformArchive(raw, dataFiles.size, mediaCount);
    progress("structuring", 95, "Finalizing...");

    if (cancelRequested) throw new CancelledError();

    const out: WorkerOutMessage = {
      type: "PARSE_COMPLETE",
      archive,
      failedFiles,
    };
    self.postMessage(out);
  } catch (err) {
    if (err instanceof CancelledError) {
      mediaCache.clear();
      cachedMediaBytes = 0;
      coldMediaPaths.clear();
      retainedZip = null;
      bufferOnlyMode = false;
      const out: WorkerOutMessage = { type: "PARSE_CANCELLED" };
      self.postMessage(out);
      return;
    }
    if (err instanceof ArchiveError) {
      const out: WorkerOutMessage = {
        type: "PARSE_ERROR",
        message: err.message,
        phase: "unzipping",
        code: err.code,
      };
      self.postMessage(out);
      return;
    }
    const message =
      err instanceof Error ? err.message : "Unknown parsing error";
    const out: WorkerOutMessage = {
      type: "PARSE_ERROR",
      message,
      phase: "unzipping",
      code: "internal",
    };
    self.postMessage(out);
  }
}

// ---------------------------------------------------------------------------
// Cold-only init from a restored ZIP buffer
// ---------------------------------------------------------------------------
//
// On session restore the parsed archive is already in IDB and loaded into
// React state on the main thread, so we don't need to re-parse data files.
// We only need the buffer to be able to serve media via lazy extraction.
//
// This handler clears any existing in-memory state and stashes the buffer
// as `retainedZip`. All future GET_MEDIA requests fall straight through
// to `lazyExtract`, since the hot cache and `coldMediaPaths` set start
// empty. We deliberately don't pre-walk the ZIP to populate the hot
// cache — that would defeat the point of being lazy and cost a couple
// of seconds for big archives.
//
// `coldMediaPaths` would normally be populated during parse so
// `resolveColdPath` knows the file exists. Since we're skipping parse,
// we let `lazyExtract` short-circuit on its own (it streams the ZIP and
// only decompresses the targeted entry, returning null if not found).
// The `bufferOnlyMode` flag (declared near `retainedZip`) tells
// `handleGetMedia` to skip the cold-path lookup entirely.
// ---------------------------------------------------------------------------

function handleInitFromBuffer(buffer: ArrayBuffer) {
  mediaCache.clear();
  cachedMediaBytes = 0;
  coldMediaPaths.clear();
  retainedZip = new Uint8Array(buffer);
  bufferOnlyMode = true;
}

// ---------------------------------------------------------------------------
// Media access — hot cache first, lazy ZIP re-extract on miss
// ---------------------------------------------------------------------------

function handleGetMedia(path: string, requestId: string) {
  // Try the hot cache first (exact then fuzzy on filename).
  let bytes: Uint8Array | undefined =
    mediaCache.get(path) ?? findMediaFuzzy(path);

  // Cold fallback: if we deferred this path during parse, re-extract it
  // from the retained ZIP. Single-shot decompression — bytes are NOT
  // promoted into the hot cache so the budget invariant holds.
  if (!bytes && retainedZip) {
    if (bufferOnlyMode) {
      // After INIT_FROM_BUFFER we don't have a populated coldMediaPaths
      // set (we never walked the central directory). Try the requested
      // path verbatim, then fall back to a filename-only stream search
      // through the ZIP via lazyExtractByFilename.
      bytes =
        lazyExtract(retainedZip, path) ??
        lazyExtractByFilename(retainedZip, path) ??
        undefined;
    } else {
      const resolved = resolveColdPath(path);
      if (resolved) {
        bytes = lazyExtract(retainedZip, resolved) ?? undefined;
      }
    }
  }

  if (!bytes) {
    const out: WorkerOutMessage = { type: "MEDIA_RESULT", requestId, buffer: null };
    self.postMessage(out);
    return;
  }

  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);

  const out: WorkerOutMessage = {
    type: "MEDIA_RESULT",
    requestId,
    buffer: arrayBuffer,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self.postMessage as any)(out, [arrayBuffer]);
}

/** Try matching by filename only (without directory prefix) */
function findMediaFuzzy(path: string): Uint8Array | undefined {
  const filename = path.split("/").pop();
  if (!filename) return undefined;

  for (const [key, value] of mediaCache) {
    if (key.endsWith("/" + filename) || key === filename) {
      return value;
    }
  }
  return undefined;
}

/**
 * Find the cold-cache key for `path`, allowing the same fuzzy match the hot
 * path uses. Returns undefined if the file isn't tracked at all.
 */
function resolveColdPath(path: string): string | undefined {
  if (coldMediaPaths.has(path)) return path;
  const filename = path.split("/").pop();
  if (!filename) return undefined;
  for (const key of coldMediaPaths) {
    if (key.endsWith("/" + filename) || key === filename) return key;
  }
  return undefined;
}

/**
 * Stream the retained ZIP and decompress just one entry. Bails out as soon
 * as the target is fully consumed so we don't pay for the tail.
 *
 * We hold the result in an object reference so TypeScript doesn't narrow
 * the closure-mutated `value` to its initial `null` for the loop below.
 */
function lazyExtract(
  zipBuffer: Uint8Array,
  targetPath: string,
): Uint8Array | null {
  const slot: { value: Uint8Array | null } = { value: null };

  const uz = new Unzip((file) => {
    if (file.name !== targetPath) return; // skip — never .start()ing means no decode
    const chunks: Uint8Array[] = [];
    file.ondata = (_err, chunk, final) => {
      chunks.push(chunk);
      if (final) slot.value = combineChunks(chunks);
    };
    file.start();
  });
  uz.register(UnzipInflate);
  uz.register(UnzipPassThrough);

  const CHUNK = 65536;
  for (let i = 0; i < zipBuffer.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, zipBuffer.length);
    uz.push(zipBuffer.subarray(i, end), end === zipBuffer.length);
    if (slot.value !== null) break; // target fully decoded, skip the tail
  }

  return slot.value;
}

/**
 * Same idea as `lazyExtract`, but matches by filename only (without the
 * directory prefix). Used in `INIT_FROM_BUFFER` mode where we don't have
 * an authoritative path map populated during parse, so the requested
 * path may differ from the ZIP entry name in directory casing.
 */
function lazyExtractByFilename(
  zipBuffer: Uint8Array,
  requestedPath: string,
): Uint8Array | null {
  const filename = requestedPath.split("/").pop();
  if (!filename) return null;
  const suffix = "/" + filename;
  const slot: { value: Uint8Array | null } = { value: null };

  const uz = new Unzip((file) => {
    if (!file.name.endsWith(suffix) && file.name !== filename) return;
    const chunks: Uint8Array[] = [];
    file.ondata = (_err, chunk, final) => {
      chunks.push(chunk);
      if (final) slot.value = combineChunks(chunks);
    };
    file.start();
  });
  uz.register(UnzipInflate);
  uz.register(UnzipPassThrough);

  const CHUNK = 65536;
  for (let i = 0; i < zipBuffer.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, zipBuffer.length);
    uz.push(zipBuffer.subarray(i, end), end === zipBuffer.length);
    if (slot.value !== null) break;
  }

  return slot.value;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isMediaPath(path: string): boolean {
  return (
    path.includes("_media/") ||
    path.includes("/media/") ||
    /\.(jpg|jpeg|png|gif|mp4|webm|webp|svg)$/i.test(path)
  );
}

function progress(
  phase: ProgressUpdate["phase"],
  percent: number,
  message: string,
  currentFile?: string,
) {
  const out: WorkerOutMessage = {
    type: "PROGRESS",
    progress: { phase, percent, message, currentFile },
  };
  self.postMessage(out);
}
