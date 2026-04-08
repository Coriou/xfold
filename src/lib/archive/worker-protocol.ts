import type { ParsedArchive } from "./types";

// --- Main thread -> Worker ------------------------------------------------

export type WorkerInMessage =
  | { type: "PARSE_ARCHIVE"; buffer: ArrayBuffer }
  | { type: "GET_MEDIA"; path: string; requestId: string }
  | { type: "CANCEL_PARSE" }
  /**
   * Hand the worker a previously-saved ZIP buffer (e.g. from IDB on
   * session restore) so it can serve media via the cold-path lazy
   * extractor. Skips parsing entirely — the parsed archive is already
   * in memory on the main thread, all the worker needs is the bytes
   * for media reads.
   */
  | { type: "INIT_FROM_BUFFER"; buffer: ArrayBuffer };

// --- Worker -> Main thread ------------------------------------------------

export type WorkerOutMessage =
  | { type: "PROGRESS"; progress: ProgressUpdate }
  | { type: "PARSE_COMPLETE"; archive: ParsedArchive; failedFiles: string[] }
  | {
      type: "PARSE_ERROR";
      message: string;
      phase: string;
      code?: ParseErrorCode | undefined;
    }
  | { type: "PARSE_CANCELLED" }
  | { type: "MEDIA_RESULT"; requestId: string; buffer: ArrayBuffer | null };

export interface ProgressUpdate {
  phase: "reading" | "unzipping" | "parsing" | "structuring" | "restoring";
  percent: number;
  message: string;
  currentFile?: string | undefined;
}

/**
 * Coarse error categories so the UI can show actionable messages instead
 * of raw error strings.
 */
export type ParseErrorCode =
  | "not-an-archive" // ZIP didn't open / no entries
  | "not-an-x-archive" // ZIP opened but no recognizable X data
  | "corrupt" // entries failed to decompress
  | "internal"; // unexpected worker error
