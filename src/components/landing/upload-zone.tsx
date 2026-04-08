"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { formatBytes } from "@/lib/format";

interface UploadZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

/**
 * Hard upper bound on the input file size before we even attempt to read it.
 * Anything larger is rejected up front so we don't freeze the tab. Mirrors the
 * decompressed-byte ceiling enforced inside the worker.
 */
const MAX_INPUT_BYTES = 8 * 1024 * 1024 * 1024; // 8 GB

const ZIP_MIME_TYPES = new Set<string>([
  "application/zip",
  "application/x-zip-compressed",
  "application/x-zip",
  "multipart/x-zip",
  "", // Some browsers (notably Safari) report empty string for .zip
]);

function looksLikeZip(file: File): boolean {
  if (file.name.toLowerCase().endsWith(".zip")) return true;
  if (ZIP_MIME_TYPES.has(file.type)) return true;
  return false;
}

export function UploadZone({ onFile, disabled }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Safety net: prevent the browser from navigating to the dropped file's
  // URL when the user releases a drag *outside* the drop zone. Without this,
  // missing the target by a few pixels causes a full page navigation.
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  const accept = useCallback(
    (file: File) => {
      if (!looksLikeZip(file)) {
        setError(
          `“${file.name}” isn't a .zip file. Please upload the X archive ZIP from x.com/settings/download_your_data.`,
        );
        return;
      }
      if (file.size > MAX_INPUT_BYTES) {
        setError(
          `“${file.name}” is too large to process safely (${formatBytes(file.size)}). The maximum is 8 GB.`,
        );
        return;
      }
      setError(null);
      onFile(file);
    },
    [onFile],
  );

  const openPicker = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleClick = useCallback(() => {
    openPicker();
  }, [openPicker]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPicker();
      }
    },
    [openPicker],
  );

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragCounter.current += 1;
      setDragOver(true);
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      // preventDefault on dragover is what tells the browser "I'll handle
      // this drop". Without it, the drop event never fires and the browser
      // navigates to the file URL instead.
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      if (e.dataTransfer.dropEffect !== "copy") {
        e.dataTransfer.dropEffect = "copy";
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDragOver(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) accept(file);
    },
    [accept, disabled],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // Reset so picking the same file twice still triggers onChange
      e.target.value = "";
      if (file) accept(file);
    },
    [accept],
  );

  return (
    <div className="w-full max-w-lg">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload your X archive ZIP file. Drop a file here or press Enter to browse."
        aria-disabled={disabled || undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          group relative flex w-full cursor-pointer flex-col items-center
          justify-center rounded-2xl border-2 border-dashed px-8 py-16 text-center
          transition-all duration-200
          focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background
          ${
            dragOver
              ? "border-accent bg-accent-muted/30 scale-[1.02]"
              : "border-border hover:border-border-hover hover:bg-background-raised/50"
          }
          ${disabled ? "pointer-events-none opacity-50" : ""}
        `}
      >
        {/* Upload icon */}
        <div className="pointer-events-none mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-background-raised text-foreground-muted transition-colors group-hover:text-accent">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <p className="pointer-events-none text-base font-medium text-foreground">
          {dragOver ? "Drop your archive" : "Drop your X archive here"}
        </p>
        <p className="pointer-events-none mt-1 text-sm text-foreground-muted">
          or click to browse — .zip only
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={handleFileInput}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-left text-sm text-danger"
        >
          {error}
        </div>
      )}
    </div>
  );
}
