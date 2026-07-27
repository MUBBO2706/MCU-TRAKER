import { MCU_TITLES, MCU_CHARACTERS } from '../data/mcuData';

const CACHE_VERSION = 'v1.0';
const CACHE_NAME = `mcu-asset-cache-${CACHE_VERSION}`;
const DB_NAME = `mcu-asset-db`;
const STORE_NAME = `assets`;

const isClient = typeof window !== 'undefined';

// Check if Cache Storage API is available
function hasCacheAPI(): boolean {
  return isClient && 'caches' in window;
}

// Open IndexedDB database for fallback
async function openIndexedDB(): Promise<IDBDatabase | null> {
  if (!isClient || !('indexedDB' in window)) return null;
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

// Retrieve from IndexedDB
async function getFromIDB(key: string): Promise<Blob | null> {
  const db = await openIndexedDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

// Save to IndexedDB
async function saveToIDB(key: string, blob: Blob): Promise<void> {
  const db = await openIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(blob, key);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

// Delete from IndexedDB
async function deleteFromIDB(key: string): Promise<void> {
  const db = await openIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

// Clear IndexedDB store
async function clearIDB(): Promise<void> {
  const db = await openIndexedDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

// Extract all external image urls that require proxying
export function getAllExternalUrls(): string[] {
  const urls = new Set<string>();

  // Movie and Series Posters
  for (const title of MCU_TITLES) {
    if (
      title.posterUrl &&
      !title.posterUrl.startsWith('/') &&
      !title.posterUrl.startsWith('data:') &&
      title.posterUrl.startsWith('http')
    ) {
      urls.add(title.posterUrl);
    }
    if (
      title.backdropUrl &&
      !title.backdropUrl.startsWith('/') &&
      !title.backdropUrl.startsWith('data:') &&
      title.backdropUrl.startsWith('http')
    ) {
      urls.add(title.backdropUrl);
    }
  }

  // Character Journey Avatars
  for (const char of MCU_CHARACTERS) {
    if (
      char.avatarUrl &&
      !char.avatarUrl.startsWith('/') &&
      !char.avatarUrl.startsWith('data:') &&
      char.avatarUrl.startsWith('http')
    ) {
      urls.add(char.avatarUrl);
    }
  }

  return Array.from(urls);
}

// In-memory cache map of URL to Object URL
const objectUrlMap = new Map<string, string>();

// Avoid duplicate concurrent fetches for the same asset
const activeDownloads = new Map<string, Promise<string>>();

export interface CacheProgress {
  total: number;
  completed: number;
  failed: number;
  isSyncing: boolean;
  isComplete: boolean;
}

let currentProgress: CacheProgress = {
  total: 0,
  completed: 0,
  failed: 0,
  isSyncing: false,
  isComplete: false,
};

const progressListeners = new Set<(progress: CacheProgress) => void>();

export function subscribeToCacheProgress(listener: (progress: CacheProgress) => void) {
  progressListeners.add(listener);
  listener({ ...currentProgress });
  return () => {
    progressListeners.delete(listener);
  };
}

function notifyProgressListeners() {
  const progressCopy = { ...currentProgress };
  progressListeners.forEach((listener) => listener(progressCopy));
}

// Initialize cache & handle cache version invalidation
export async function initCache() {
  if (!isClient) return;
  try {
    // 1. Invalidate older Cache Storage API versions
    if (hasCacheAPI()) {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key !== CACHE_NAME && key.startsWith('mcu-asset-cache-')) {
          await caches.delete(key);
        }
      }
    }

    // 2. Invalidate older IndexedDB or local storage states if version mismatch
    const savedVersion = localStorage.getItem('mcu_cache_version');
    if (savedVersion !== CACHE_VERSION) {
      await clearIDB();
      localStorage.setItem('mcu_cache_version', CACHE_VERSION);
      localStorage.removeItem('mcu_assets_cached_v1'); // Reset first run sync
    }

    // Initialize progress status based on pre-caching state
    const alreadySynced = localStorage.getItem('mcu_assets_cached_v1') === 'true';
    if (alreadySynced) {
      currentProgress = {
        total: getAllExternalUrls().length,
        completed: getAllExternalUrls().length,
        failed: 0,
        isSyncing: false,
        isComplete: true,
      };
      notifyProgressListeners();
    }
  } catch (e) {
    console.warn('Cache initialization failed', e);
  }
}

// Retrieve cached asset as a Blob, checking Cache API first, then IndexedDB
export async function getCachedAsset(url: string): Promise<Blob | null> {
  if (!isClient) return null;

  // Try Cache API
  if (hasCacheAPI()) {
    try {
      const cachedResponse = await caches.match(url);
      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        // Sanity check to protect against empty or corrupted caches
        if (blob && blob.size > 100) {
          return blob;
        } else {
          // Corrupted entry: remove it
          const cache = await caches.open(CACHE_NAME);
          await cache.delete(url);
        }
      }
    } catch (e) {
      console.warn(`Cache API match failed for ${url}:`, e);
    }
  }

  // Try IndexedDB fallback
  try {
    const idbBlob = await getFromIDB(url);
    if (idbBlob) {
      if (idbBlob.size > 100) {
        return idbBlob;
      } else {
        await deleteFromIDB(url);
      }
    }
  } catch (e) {
    console.warn(`IndexedDB match failed for ${url}:`, e);
  }

  return null;
}

// Fetch from backend proxy and store in cache
async function fetchAndCache(url: string, characterId?: string): Promise<Blob> {
  const charParam = characterId ? `&characterId=${characterId}` : '';
  const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}${charParam}`;

  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`HTTP fetch failed with status: ${response.status}`);
  }

  const blob = await response.blob();

  // Basic validation that we received a valid image blob
  if (blob.size < 100 || !blob.type.startsWith('image/')) {
    throw new Error(`Downloaded asset is not a valid image (${blob.type}, ${blob.size} bytes)`);
  }

  // Store in cache
  if (hasCacheAPI()) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cacheResponse = new Response(blob, {
        headers: {
          'Content-Type': blob.type,
          'Content-Length': blob.size.toString(),
          'Cache-Control': 'public, max-age=31536000', // 1 year
        },
      });
      await cache.put(url, cacheResponse);
    } catch (e) {
      console.warn(`Failed to store in Cache API, falling back to IndexedDB:`, e);
      await saveToIDB(url, blob);
    }
  } else {
    await saveToIDB(url, blob);
  }

  return blob;
}

// Principal entry-point for LazyImage and other components.
// Returns a local Object URL for instant loading, or direct fallback proxy URL on complete fail.
export async function getAssetUrl(url: string, characterId?: string): Promise<string> {
  if (!url) return '';
  if (!isClient || url.startsWith('/') || url.startsWith('data:')) {
    return url;
  }

  // 1. Check in-memory Object URL cache
  if (objectUrlMap.has(url)) {
    return objectUrlMap.get(url)!;
  }

  // 2. Check persistent cache (Cache Storage / IndexedDB)
  try {
    const cachedBlob = await getCachedAsset(url);
    if (cachedBlob) {
      const localUrl = URL.createObjectURL(cachedBlob);
      objectUrlMap.set(url, localUrl);
      return localUrl;
    }
  } catch (e) {
    console.warn(`Error resolving cached asset for ${url}:`, e);
  }

  // 3. Prevent duplicate active downloads for the same asset
  if (activeDownloads.has(url)) {
    return activeDownloads.get(url)!;
  }

  // 4. Lazy caching: download on first request
  const downloadPromise = (async () => {
    try {
      const blob = await fetchAndCache(url, characterId);
      const localUrl = URL.createObjectURL(blob);
      objectUrlMap.set(url, localUrl);
      return localUrl;
    } catch (e) {
      console.warn(`Lazy cache load failed for ${url}, using direct proxy:`, e);
      const charParam = characterId ? `&characterId=${characterId}` : '';
      return `/api/image-proxy?url=${encodeURIComponent(url)}${charParam}`;
    } finally {
      activeDownloads.delete(url);
    }
  })();

  activeDownloads.set(url, downloadPromise);
  return downloadPromise;
}

// Background pre-cache routine triggered on first launch or via settings
export async function startPreCaching(force = false) {
  if (!isClient) return;
  if (currentProgress.isSyncing) return;

  const alreadySynced = localStorage.getItem('mcu_assets_cached_v1') === 'true';
  if (alreadySynced && !force) {
    const urlsCount = getAllExternalUrls().length;
    currentProgress = {
      total: urlsCount,
      completed: urlsCount,
      failed: 0,
      isSyncing: false,
      isComplete: true,
    };
    notifyProgressListeners();
    return;
  }

  const urls = getAllExternalUrls();
  currentProgress = {
    total: urls.length,
    completed: 0,
    failed: 0,
    isSyncing: true,
    isComplete: false,
  };
  notifyProgressListeners();

  const concurrentWorkers = 4; // Fetch 4 in parallel
  const queue = [...urls];

  const worker = async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;

      try {
        await fetchAndCache(url);
        currentProgress.completed++;
      } catch (e) {
        currentProgress.failed++;
        console.warn(`Background pre-cache failed for URL: ${url}`, e);
      }
      notifyProgressListeners();
    }
  };

  const workers = Array(concurrentWorkers)
    .fill(null)
    .map(() => worker());
  await Promise.all(workers);

  currentProgress.isSyncing = false;
  currentProgress.isComplete = true;
  notifyProgressListeners();

  localStorage.setItem('mcu_assets_cached_v1', 'true');
}

// Clear cached items and revoke active local object URLs
export async function clearCache() {
  if (!isClient) return;
  try {
    if (hasCacheAPI()) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }
    await clearIDB();

    // Revoke object URLs to release memory
    for (const objectUrl of objectUrlMap.values()) {
      URL.revokeObjectURL(objectUrl);
    }
    objectUrlMap.clear();
    activeDownloads.clear();

    localStorage.removeItem('mcu_assets_cached_v1');

    currentProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      isSyncing: false,
      isComplete: false,
    };
    notifyProgressListeners();
  } catch (e) {
    console.error('Failed to clear client-side asset cache:', e);
  }
}
