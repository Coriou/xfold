// ---------------------------------------------------------------------------
// Archive parsing Web Worker
// ---------------------------------------------------------------------------
// Uses fflate's streaming Unzip class which processes entries one at a time.
// Data files (.js) are parsed into structured data. Media files are
// decompressed and cached in memory for instant access via GET_MEDIA.
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

// Cache of decompressed media files (path -> bytes)
const mediaCache = new Map<string, Uint8Array>();

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

    mediaCache.clear();

    const uz = new Unzip((file) => {
      totalEntries++;
      const name = file.name;
      const lower = name.toLowerCase();

      // Data file: decompress and store for parsing
      if (lower.startsWith("data/") && lower.endsWith(".js")) {
        const chunks: Uint8Array[] = [];
        file.ondata = (_err, chunk, final) => {
          chunks.push(chunk);
          if (final) dataFiles.set(name, combineChunks(chunks));
        };
        file.start();
        return;
      }

      // Media file: decompress and cache for instant GET_MEDIA access
      if (isMediaPath(lower)) {
        mediaCount++;
        const chunks: Uint8Array[] = [];
        file.ondata = (_err, chunk, final) => {
          chunks.push(chunk);
          if (final) mediaCache.set(name, combineChunks(chunks));
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
// Instant media access from cache
// ---------------------------------------------------------------------------

function handleGetMedia(path: string, requestId: string) {
  // Try exact match first, then fuzzy
  const bytes = mediaCache.get(path) ?? findMediaFuzzy(path);

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
