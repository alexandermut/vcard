// IndexedDB cache for FST data
const DB_NAME = 'kontakte-me-cache';
const DB_VERSION = 2; // Bumped for schema compatibility
const STORE_NAME = 'fst-data';

interface FSTCacheEntry {
    key: string;
    data: Uint8Array;
    timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
        };
    });
}

export async function getCachedFST(): Promise<Uint8Array | null> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.get('streets-fst');
            request.onsuccess = () => {
                const result = request.result as FSTCacheEntry | undefined;
                resolve(result?.data || null);
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn('Failed to get cached FST:', error);
        return null;
    }
}

export async function cacheFST(data: Uint8Array): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const entry: FSTCacheEntry = {
            key: 'streets-fst',
            data,
            timestamp: Date.now(),
        };

        return new Promise((resolve, reject) => {
            const request = store.put(entry);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn('Failed to cache FST:', error);
    }
}

export async function clearFSTCache(): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        return new Promise((resolve, reject) => {
            const request = store.delete('streets-fst');
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn('Failed to clear FST cache:', error);
    }
}
