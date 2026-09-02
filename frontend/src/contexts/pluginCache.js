// Local cache of downloaded plugin payloads, so opening a room a second time
// doesn't re-download several megabytes before the table can render.
//
// This deliberately does NOT use localStorage. The backend gzips the whole
// plugin and base64-encodes it, and two multipliers then stack against
// localStorage's ~5MB per-origin cap: base64 costs 4/3, and localStorage stores
// strings as UTF-16, so every character costs 2 bytes. A ~1.5MB gzip becomes
// ~2MB of base64 and ~4MB once stored - a single plugin very nearly fills the
// origin's entire budget, and a player who has opened two plugins is over it
// for good. Past that point every write throws QuotaExceededError, nothing
// evicted, and the cache silently stopped working forever: every room open
// re-downloaded the plugin.
//
// IndexedDB has neither multiplier - it stores bytes as bytes - and a quota
// measured in hundreds of MB, so the raw gzip bytes live here instead.

const DB_NAME = "dragncards";
const DB_VERSION = 1;
const STORE = "pluginData";
const LEGACY_PREFIX = "pluginData_";

let dbPromise = null;

const openDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB open blocked"));
  }).catch((e) => {
    // Don't latch the rejection: a later attempt (e.g. after the user leaves a
    // private window) should be able to open the database.
    dbPromise = null;
    throw e;
  });
  return dbPromise;
};

// Returns the cached gzip bytes for a plugin, or null if there are none.
// Every failure here is non-fatal: the caller just downloads instead.
export const readPluginCache = async (pluginId) => {
  if (pluginId == null) return null;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).get(String(pluginId));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("Plugin cache read failed; downloading instead:", e);
    return null;
  }
};

// Best-effort write. A failure only costs the next room open its head start,
// so it is logged and swallowed rather than surfaced.
export const writePluginCache = async (pluginId, bytes) => {
  if (pluginId == null || !bytes) return false;
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(bytes, String(pluginId));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return true;
  } catch (e) {
    console.warn("Plugin cache write failed; this room will re-download next time:", e);
    return false;
  }
};

// Drops the pre-IndexedDB localStorage entries. Players who used the old cache
// are sitting on multiple megabytes of dead weight in an origin budget that is
// also home to their auth tokens, so this is worth doing once on startup even
// though nothing reads those keys any more.
export const purgeLegacyPluginCache = () => {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(LEGACY_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    // Storage disabled entirely; there is nothing cached to clean up.
  }
};
