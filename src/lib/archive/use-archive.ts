"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ParsedArchive } from "./types";
import type {
  WorkerInMessage,
  WorkerOutMessage,
  ProgressUpdate,
  ParseErrorCode,
} from "./worker-protocol";
import {
  saveArchive as idbSave,
  loadArchive as idbLoad,
  clearArchive as idbClear,
} from "./idb-cache";
import { buildDemoArchive } from "./demo-archive";

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export type ArchiveState =
  | { status: "idle" }
  | { status: "loading"; progress: ProgressUpdate }
  | {
      status: "ready";
      archive: ParsedArchive;
      /** Files that failed to parse during the most recent parse, if any. */
      failedFiles?: string[] | undefined;
    }
  | { status: "error"; message: string; code?: ParseErrorCode | undefined };

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useArchiveWorker() {
  const [state, setState] = useState<ArchiveState>({ status: "idle" });
  const workerRef = useRef<Worker | null>(null);
  const mediaCallbacks = useRef<
    Map<string, { resolve: (b: Blob | null) => void }>
  >(new Map());

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Restore from IndexedDB on mount
  useEffect(() => {
    void idbLoad().then((cached) => {
      if (cached) {
        setState((prev) =>
          prev.status === "idle" ? { status: "ready", archive: cached } : prev,
        );
      }
    });
  }, []);

  const getOrCreateWorker = useCallback((): Worker => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(
      new URL("./worker.ts", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;

      switch (msg.type) {
        case "PROGRESS":
          setState({ status: "loading", progress: msg.progress });
          break;

        case "PARSE_COMPLETE":
          setState({
            status: "ready",
            archive: msg.archive,
            failedFiles:
              msg.failedFiles.length > 0 ? msg.failedFiles : undefined,
          });
          void idbSave(msg.archive);
          break;

        case "PARSE_ERROR":
          setState({
            status: "error",
            message: msg.message,
            code: msg.code,
          });
          break;

        case "PARSE_CANCELLED":
          setState({ status: "idle" });
          break;

        case "MEDIA_RESULT": {
          const cb = mediaCallbacks.current.get(msg.requestId);
          if (cb) {
            mediaCallbacks.current.delete(msg.requestId);
            cb.resolve(msg.buffer ? new Blob([msg.buffer]) : null);
          }
          break;
        }
      }
    };

    worker.onerror = (e) => {
      setState({
        status: "error",
        message: e.message || "Worker failed unexpectedly",
        code: "internal",
      });
    };

    workerRef.current = worker;
    return worker;
  }, []);

  const loadArchive = useCallback(
    async (file: File) => {
      setState({
        status: "loading",
        progress: {
          phase: "reading",
          percent: 0,
          message: "Reading file...",
        },
      });

      try {
        const buffer = await file.arrayBuffer();
        const worker = getOrCreateWorker();
        const msg: WorkerInMessage = { type: "PARSE_ARCHIVE", buffer };
        worker.postMessage(msg, [buffer]);
      } catch {
        setState({
          status: "error",
          message: "Failed to read file",
          code: "internal",
        });
      }
    },
    [getOrCreateWorker],
  );

  const cancelParse = useCallback(() => {
    const worker = workerRef.current;
    if (!worker) {
      setState({ status: "idle" });
      return;
    }
    const msg: WorkerInMessage = { type: "CANCEL_PARSE" };
    worker.postMessage(msg);
  }, []);

  const dismissWarnings = useCallback(() => {
    setState((prev) =>
      prev.status === "ready"
        ? { status: "ready", archive: prev.archive }
        : prev,
    );
  }, []);

  const getMedia = useCallback((path: string): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const worker = workerRef.current;
      if (!worker) {
        resolve(null);
        return;
      }

      const requestId = crypto.randomUUID();
      mediaCallbacks.current.set(requestId, { resolve });

      const msg: WorkerInMessage = {
        type: "GET_MEDIA",
        path,
        requestId,
      };
      worker.postMessage(msg);
    });
  }, []);

  const reset = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    mediaCallbacks.current.clear();
    void idbClear();
    setState({ status: "idle" });
  }, []);

  /**
   * Load the bundled demo archive into the dashboard. Bypasses the worker
   * and the IDB cache entirely — the demo is meant to be a stateless
   * "what does this look like" view, not a thing the user persists.
   */
  const loadDemoArchive = useCallback(() => {
    const archive = buildDemoArchive();
    setState({ status: "ready", archive });
  }, []);

  return {
    state,
    loadArchive,
    loadDemoArchive,
    cancelParse,
    dismissWarnings,
    getMedia,
    reset,
  };
}
