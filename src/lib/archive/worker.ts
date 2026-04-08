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
      // Fire-and-forget — handleParse is async because it yields to the
      // message loop periodically (so CANCEL_PARSE messages can interrupt
      // it). The promise is never awaited because postMessage doesn't
      // await onmessage handlers.
      void handleParse(msg.buffer);
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

/**
 * Yield to the worker's message loop. Used periodically inside the parse
 * loop so CANCEL_PARSE messages from the main thread aren't queued behind
 * an entire synchronous handleParse run. Without these yields, clicking
 * Cancel during a multi-second parse does nothing visible until the parse
 * finishes.
 */
function yieldToMessageLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function handleParse(buffer: ArrayBuffer) {
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

    // Feed data in chunks to avoid blowing the call stack. Yield to the
    // message loop every 16 chunks (~1 MB) so CANCEL_PARSE messages don't
    // sit queued behind a multi-second parse — the next loop iteration's
    // cancelRequested check will see the updated flag.
    const CHUNK = 65536;
    let chunkIndex = 0;
    for (let i = 0; i < zipData.length; i += CHUNK) {
      if (cancelRequested) throw new CancelledError();
      const end = Math.min(i + CHUNK, zipData.length);
      uz.push(zipData.subarray(i, end), end === zipData.length);
      chunkIndex++;
      if (chunkIndex % 16 === 0) {
        await yieldToMessageLoop();
      }
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
      // Yield every few files so cancel messages can interrupt the loop.
      // The next iteration's cancelRequested check will see the updated flag.
      if (parsed % 4 === 0) {
        await yieldToMessageLoop();
      }
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
// Init from a restored ZIP buffer
// ---------------------------------------------------------------------------
//
// On session restore the parsed archive is already in IDB and loaded into
// React state on the main thread, so we don't need to re-parse data files.
// We only need the buffer to be able to serve media via lazy extraction.
//
// This handler stores the buffer and does ONE streaming pass through the
// ZIP to enumerate every entry name (without decompressing them — we never
// call `file.start()`). For each media path we add the name to
// `coldMediaPaths`. Once that's done, `handleGetMedia` can use the same
// `resolveColdPath` lookup as a freshly parsed archive: O(1) name match
// on the in-memory set, then a single-target lazy extract.
//
// Without this pass, every getMedia call on a restored archive had to do
// a full filename-only stream of the entire ZIP, which made the media
// section feel frozen for ~30s after a refresh on real-world archives.
// ---------------------------------------------------------------------------

function handleInitFromBuffer(buffer: ArrayBuffer) {
  mediaCache.clear();
  cachedMediaBytes = 0;
  coldMediaPaths.clear();
  const zipData = new Uint8Array(buffer);
  retainedZip = zipData;

  // Enumerate names without decompressing. The Unzip callback fires for
  // every entry; we record the name and never call file.start(), so
  // fflate skips decompression entirely.
  const uz = new Unzip((file) => {
    const name = file.name;
    if (isMediaPath(name.toLowerCase())) {
      coldMediaPaths.add(name);
    }
  });
  uz.register(UnzipInflate);
  uz.register(UnzipPassThrough);

  const CHUNK = 65536;
  for (let i = 0; i < zipData.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, zipData.length);
    uz.push(zipData.subarray(i, end), end === zipData.length);
  }
}

// ---------------------------------------------------------------------------
// Media access — hot cache first, lazy ZIP re-extract on miss
// ---------------------------------------------------------------------------

function handleGetMedia(path: string, requestId: string) {
  // Try the hot cache first (exact then fuzzy on filename).
  let bytes: Uint8Array | undefined =
    mediaCache.get(path) ?? findMediaFuzzy(path);

  // Cold fallback: if we deferred this path during parse (or if we just
  // enumerated it during INIT_FROM_BUFFER), re-extract it from the
  // retained ZIP. Single-shot decompression — bytes are NOT promoted into
  // the hot cache so the budget invariant holds.
  if (!bytes && retainedZip) {
    const resolved = resolveColdPath(path);
    if (resolved) {
      bytes = lazyExtract(retainedZip, resolved) ?? undefined;
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
