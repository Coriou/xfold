"use client";

import { useEffect, useRef, useSyncExternalStore, useCallback } from "react";
import { useArchive } from "@/lib/archive/archive-store";

interface ArchiveMediaProps {
  localPath: string | null;
  alt?: string;
  className?: string;
  type?: "photo" | "video" | "animated_gif";
}

type MediaState = { status: "loading" } | { status: "loaded"; src: string } | { status: "error" };

export function ArchiveMedia({
  localPath,
  alt = "",
  className = "",
  type = "photo",
}: ArchiveMediaProps) {
  const { getMedia } = useArchive();
  const stateRef = useRef<MediaState>(
    localPath ? { status: "loading" } : { status: "error" },
  );
  const listenersRef = useRef(new Set<() => void>());
  const urlRef = useRef<string | null>(null);

  const subscribe = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => { listenersRef.current.delete(cb); };
  }, []);

  const getSnapshot = useCallback(() => stateRef.current, []);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!localPath) return;

    let cancelled = false;

    void getMedia(localPath).then((blob) => {
      if (cancelled) return;
      if (!blob) {
        stateRef.current = { status: "error" };
      } else {
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        stateRef.current = { status: "loaded", src: url };
      }
      listenersRef.current.forEach((cb) => cb());
    });

    return () => {
      cancelled = true;
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [localPath, getMedia]);

  if (state.status === "loading") {
    return (
      <div className={`animate-pulse bg-background-overlay ${className}`} />
    );
  }

  if (state.status === "error") {
    return (
      <div
        className={`flex items-center justify-center bg-background-overlay text-foreground-muted ${className}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  }

  if (type === "video" || type === "animated_gif") {
    return (
      <video
        src={state.src}
        className={className}
        controls={type === "video"}
        autoPlay={type === "animated_gif"}
        loop={type === "animated_gif"}
        muted={type === "animated_gif"}
        playsInline
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={state.src} alt={alt} className={className} />
  );
}
