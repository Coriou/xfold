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
  saveZipBuffer as idbSaveZip,
  loadZipBuffer as idbLoadZip,
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
  /**
   * On session restore we load the ZIP buffer from IDB but don't spawn a
   * worker for it until the first media request comes in. We hold the
   * bytes in this ref so the lazy spawn can hand them off to the worker
   * via INIT_FROM_BUFFER. Cleared when a fresh archive is uploaded.
   *
   * Without this, every returning visitor sees broken media tiles
   * everywhere — `getMedia` returns null because no worker exists, and
   * the media component renders its error placeholder.
   */
  const restoredBufferRef = useRef<Uint8Array | null>(null);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Restore from IndexedDB on mount — both the parsed archive AND the
  // source ZIP buffer (so media works after refresh, not just data).
  useEffect(() => {
    void Promise.all([idbLoad(), idbLoadZip()]).then(([cached, zipBytes]) => {
      if (cached) {
        // Stash the buffer for lazy worker init on first media request.
        if (zipBytes) restoredBufferRef.current = zipBytes;
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
        // Persist the ZIP bytes to IDB *before* transferring the buffer to
        // the worker — once transferred the original is detached and we
        // can't read it anymore. We `await` the save so the bytes are
        // structurally cloned into the IDB request before the transfer
        // detaches the buffer. The save is best-effort: if it fails (quota
        // exceeded), parsing still proceeds but media won't survive a
        // refresh, which is the same as the pre-fix behavior.
        await idbSaveZip(buffer);
        // A fresh upload invalidates any cached restore-buffer.
        restoredBufferRef.current = null;
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

  const getMedia = useCallback(
    (path: string): Promise<Blob | null> => {
      return new Promise((resolve) => {
        let worker = workerRef.current;

        // Lazy worker spawn after a session restore. The IDB-restored archive
        // had no associated worker (we don't spawn one upfront — many users
        // never visit a media-heavy section). When the first media request
        // comes in, we spin up a worker and seed it with the cached buffer
        // via INIT_FROM_BUFFER. Subsequent requests reuse the worker.
        if (!worker && restoredBufferRef.current) {
          const buffer = restoredBufferRef.current.buffer.slice(
            restoredBufferRef.current.byteOffset,
            restoredBufferRef.current.byteOffset +
              restoredBufferRef.current.byteLength,
          ) as ArrayBuffer;
          worker = getOrCreateWorker();
          const initMsg: WorkerInMessage = {
            type: "INIT_FROM_BUFFER",
            buffer,
          };
          worker.postMessage(initMsg, [buffer]);
          // Drop our retained reference — the bytes now live in the worker.
          // If the user navigates away and back, the IDB restore path will
          // re-load and re-init via this same flow.
          restoredBufferRef.current = null;
        }

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
    },
    [getOrCreateWorker],
  );

  const reset = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    mediaCallbacks.current.clear();
    restoredBufferRef.current = null;
    void idbClear();
    setState({ status: "idle" });
  }, []);

  /**
   * Load the bundled demo archive into the dashboard. Bypasses the worker
   * and the IDB cache entirely — the demo is meant to be a stateless
   * "what does this look like" view, not a thing the user persists.
   *
   * If the user had a real cached archive open and clicks "demo", we
   * also drop any restored buffer ref so subsequent media requests in
   * demo mode don't accidentally hit the wrong worker buffer. Demo
   * media items have `localPath: null` so the request never happens
   * in practice — this is just defensive.
   */
  const loadDemoArchive = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    restoredBufferRef.current = null;
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
