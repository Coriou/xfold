import { gzipSync, gunzipSync, strFromU8, strToU8 } from "fflate";
import type { ParsedArchive } from "./types";

const DB_NAME = "xfold-archive";
const STORE_NAME = "archives";
const DB_VERSION = 1;
/**
 * Key for the original ZIP buffer, stored separately from the parsed
 * archive entry. We persist the source ZIP so that on session restore
 * the worker can be lazily re-spawned with the same buffer for cold-path
 * media extraction. Without this, returning visitors see broken media
 * tiles everywhere because the worker's `retainedZip` only lives for
 * the lifetime of the worker.
 */
const ZIP_BUFFER_KEY = "latest-zip";

/**
 * Bump this any time the ParsedArchive shape changes in a backwards-
 * incompatible way. Older cached archives are silently discarded.
 *
 * v3 added the required `offTwitter` field on ParsedArchive plus three new
 * fields on Personalization (partnerInterests, doNotReachAdvertisers, typed
 * locationHistory).
 *
 * v4 added the `deviceId` field on AdImpression so the device-fingerprint
 * trail insight can group impressions by the hashed device identifier
 * advertisers share to retarget across campaigns.
 *
 * v5 added eleven required "hidden data" fields on ParsedArchive: deletedTweets,
 * contacts, mutes, dmMutes, groupDirectMessages, suspensions, emailChanges,
 * protectedHistory, savedSearches, communityNotes, communityNoteRatings. Older
 * caches load back without these fields, which crashes compute functions that
 * trust the type contract (e.g. `archive.deletedTweets.length`).
 */
const CACHE_VERSION = 5;

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
 * stale, unreadable, or if the cached object's shape doesn't match the
 * current ParsedArchive contract.
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
    const parsed: unknown = JSON.parse(json);
    if (!isValidParsedArchive(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Defensive shape check for the cached archive. Verifies the *required*
 * top-level fields exist with the right primitive shapes. Catches the case
 * where IDB returns data from a build that didn't bump CACHE_VERSION but
 * silently changed the schema — without this guard, downstream code that
 * trusts e.g. `archive.tweets.length` would crash on `undefined.length`.
 *
 * We don't deep-validate every field — that's the type system's job at
 * compile time. We just check the keys whose absence would crash an
 * insight on access.
 */
function isValidParsedArchive(value: unknown): value is ParsedArchive {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  // Object/null fields
  if (!isObjectOrNull(v["meta"])) return false;
  if (!isObjectOrNull(v["stats"])) return false;
  if (!("account" in v) || !isObjectOrNull(v["account"])) return false;
  if (!("profile" in v) || !isObjectOrNull(v["profile"])) return false;
  if (!("personalization" in v) || !isObjectOrNull(v["personalization"])) {
    return false;
  }
  if (!isObjectOrNull(v["offTwitter"])) return false;

  // Array fields — list every field whose absence would crash an insight
  const arrayFields = [
    "tweets",
    "likes",
    "directMessages",
    "followers",
    "following",
    "blocks",
    "adEngagements",
    "adImpressions",
    "ipAudit",
    "deviceTokens",
    "connectedApps",
    "niDevices",
    "keyRegistryDevices",
    "grokConversations",
    "screenNameChanges",
    "lists",
    "deletedTweets",
    "contacts",
    "mutes",
    "dmMutes",
    "groupDirectMessages",
    "suspensions",
    "emailChanges",
    "protectedHistory",
    "savedSearches",
    "communityNotes",
    "communityNoteRatings",
  ] as const;
  for (const field of arrayFields) {
    if (!Array.isArray(v[field])) return false;
  }

  return true;
}

function isObjectOrNull(value: unknown): boolean {
  // typeof null === "object", so this single check covers both:
  // a real object and an explicit null. Anything else fails.
  return typeof value === "object";
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
    tx.objectStore(STORE_NAME).delete(ZIP_BUFFER_KEY);
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
 * Delete just the persisted ZIP buffer, leaving the parsed-archive entry
 * alone. Used when a fresh parse is cancelled mid-flight: `loadArchive`
 * persists the buffer to IDB *before* transferring it to the worker, so on
 * cancel we have to undo that save — otherwise the next mount's restore-
 * from-IDB pass picks the cancelled bytes back up. We deliberately don't
 * touch `latest`, since the user may still have a previously-cached parsed
 * archive they expect to fall back to.
 */
export async function clearZipBuffer(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(ZIP_BUFFER_KEY);
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
 * Persist the original ZIP buffer so the worker can be lazily re-spawned
 * after a session restore. Stored separately from the parsed-archive entry
 * because the buffer can be many GB on large accounts and shouldn't bloat
 * the parsed-archive read path.
 *
 * Best-effort: failures (quota exceeded, etc.) are silently swallowed —
 * the dashboard still works, the user just won't see media after refresh.
 */
export async function saveZipBuffer(buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    // Wrap in a Uint8Array view so the cloned representation stays a typed
    // array (some IDB implementations don't preserve raw ArrayBuffer well).
    tx.objectStore(STORE_NAME).put(new Uint8Array(buffer), ZIP_BUFFER_KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // IDB save failed — likely quota. Caller still gets a working in-memory
    // session; only cross-session media restore is impacted.
  }
}

/**
 * Load the previously-saved ZIP buffer, or null if none. Returned as a
 * Uint8Array view; consumers can pass `view.buffer` to a worker as an
 * ArrayBuffer (or transfer it).
 */
export async function loadZipBuffer(): Promise<Uint8Array | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(ZIP_BUFFER_KEY);
    const stored = await new Promise<unknown>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (stored instanceof Uint8Array) return stored;
    if (stored instanceof ArrayBuffer) return new Uint8Array(stored);
    return null;
  } catch {
    return null;
  }
}
