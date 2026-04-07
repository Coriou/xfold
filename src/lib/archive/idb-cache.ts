import { gzipSync, gunzipSync, strFromU8, strToU8 } from "fflate";
import type { ParsedArchive } from "./types";

const DB_NAME = "xfold-archive";
const STORE_NAME = "archives";
const DB_VERSION = 1;

/**
 * Bump this any time the ParsedArchive shape changes in a backwards-
 * incompatible way. Older cached archives are silently discarded.
 */
const CACHE_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

interface CacheEntry {
  /** gzip-compressed JSON of the ParsedArchive */
  compressed: Uint8Array;
  version: number;
  savedAt: number;
  /** Original (uncompressed) byte length, for diagnostics */
  uncompressedSize: number;
}

interface CacheMetadata {
  savedAt: number;
  version: number;
  uncompressedSize: number;
  compressedSize: number;
}

/**
 * Persist the parsed archive to IndexedDB. Compresses with gzip first to
 * reduce quota usage by 60–70%. Failures are silent — IDB is a bonus.
 */
export async function saveArchive(archive: ParsedArchive): Promise<void> {
  try {
    const json = JSON.stringify(archive);
    const bytes = strToU8(json);
    const compressed = gzipSync(bytes, { level: 6 });

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const entry: CacheEntry = {
      compressed,
      version: CACHE_VERSION,
      savedAt: Date.now(),
      uncompressedSize: bytes.byteLength,
    };
    tx.objectStore(STORE_NAME).put(entry, "latest");
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IDB is a bonus — silently fail
  }
}

/**
 * Load and decompress the cached archive, if any. Returns null if missing,
 * stale, or unreadable.
 */
export async function loadArchive(): Promise<ParsedArchive | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get("latest");
    const entry = await new Promise<CacheEntry | undefined>(
      (resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      },
    );
    db.close();
    if (!entry || entry.version !== CACHE_VERSION) return null;

    const decompressed = gunzipSync(entry.compressed);
    const json = strFromU8(decompressed);
    return JSON.parse(json) as ParsedArchive;
  } catch {
    return null;
  }
}

/**
 * Lightweight metadata read for showing a "cached archive available" hint
 * on the landing page without paying the cost of decompressing the full
 * archive.
 */
export async function getCacheMetadata(): Promise<CacheMetadata | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get("latest");
    const entry = await new Promise<CacheEntry | undefined>(
      (resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      },
    );
    db.close();
    if (!entry || entry.version !== CACHE_VERSION) return null;
    return {
      savedAt: entry.savedAt,
      version: entry.version,
      uncompressedSize: entry.uncompressedSize,
      compressedSize: entry.compressed.byteLength,
    };
  } catch {
    return null;
  }
}

export async function clearArchive(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete("latest");
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IDB is a bonus — silently fail
  }
}
