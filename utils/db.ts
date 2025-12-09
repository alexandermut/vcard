import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { HistoryItem, Note } from '../types';
import { parseVCardString } from './vcardUtils';
import { base64ToBlob } from './imageUtils';

interface Street {
    id?: number;
    name: string;
    zip: string;
    city: string;
}

export interface FailedScan {
    id: string;
    timestamp: number;
    images: string[]; // Base64 or Blob URLs
    error: string;
    mode: string;
}

interface VCardDB extends DBSchema {
    history: {
        key: string;
        value: HistoryItem;
        indexes: { 'by-date': number; 'by-name': string; 'keywords': string[] };
    };
    notes: {
        key: string;
        value: Note;
        indexes: { 'by-date': number; 'by-contact': string };
    };
    streets: {
        key: number;
        value: Street;
        indexes: {
            'zip': string;
            'name': string;
        };
    };
    google_contacts: {
        key: string;
        value: any; // GoogleContact
        indexes: {
            'by-name': string;
        };
    };
    failed_scans: {
        key: string;
        value: FailedScan;
        indexes: { 'by-date': number };
    };
}

const DB_NAME = 'vcard-db';
const DB_VERSION = 9;
const STORE_NAME = 'history';
const STREETS_STORE = 'streets';
const GOOGLE_STORE = 'google_contacts';

let dbPromise: Promise<IDBPDatabase<VCardDB>>;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<VCardDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                // Version 1: History
                if (oldVersion < 1) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('by-date', 'timestamp');
                }

                // ... (existing version checks)

                // Version 9: Ultimate Recovery
                // Check ALL stores to guarantee consistency regardless of past state
                if (oldVersion < 9) {
                    // 1. History (Main Store) with indexes
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                        store.createIndex('by-date', 'timestamp');
                        store.createIndex('keywords', 'keywords', { multiEntry: true });
                    } else {
                        // Ensure indexes exist if store exists
                        const store = transaction.objectStore(STORE_NAME);
                        if (!store.indexNames.contains('keywords')) {
                            store.createIndex('keywords', 'keywords', { multiEntry: true });
                        }
                    }

                    // 2. Notes
                    if (!db.objectStoreNames.contains('notes')) {
                        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
                        notesStore.createIndex('by-date', 'timestamp');
                        notesStore.createIndex('by-contact', 'contactId');
                    }

                    // 3. Failed Scans
                    if (!db.objectStoreNames.contains('failed_scans')) {
                        const failedStore = db.createObjectStore('failed_scans', { keyPath: 'id' });
                        failedStore.createIndex('by-date', 'timestamp');
                    }

                    // 4. Streets
                    if (!db.objectStoreNames.contains(STREETS_STORE)) {
                        const streetStore = db.createObjectStore(STREETS_STORE, { keyPath: 'id', autoIncrement: true });
                        streetStore.createIndex('zip', 'zip');
                        streetStore.createIndex('name', 'name');
                    }

                    // 5. Google Contacts
                    if (!db.objectStoreNames.contains(GOOGLE_STORE)) {
                        db.createObjectStore(GOOGLE_STORE, { keyPath: 'resourceName' });
                    }
                }
            },
        });
    }
    return dbPromise;
};

// --- GOOGLE CONTACTS OPERATIONS ---

export const addGoogleContacts = async (contacts: any[]) => {
    const db = await initDB();
    const tx = db.transaction(GOOGLE_STORE, 'readwrite');
    const store = tx.objectStore(GOOGLE_STORE);
    for (const contact of contacts) {
        await store.put(contact);
    }
    await tx.done;
};

export const getGoogleContacts = async (limit = 50): Promise<any[]> => {
    const db = await initDB();
    return db.getAll(GOOGLE_STORE, null, limit);
};

export const searchLocalGoogleContacts = async (query: string, limit = 50): Promise<any[]> => {
    const db = await initDB();

    if (!query) {
        return db.getAll(GOOGLE_STORE, null, limit);
    }

    // For search, we unfortunately need to scan. 
    // Optimization: Use a cursor to avoid loading ALL into memory at once if possible,
    // but for < 50k items, loading all keys/values is often faster than cursor iteration due to transaction overhead.
    // However, to be safe, let's just load all, filter, and slice. 
    // 25k items in memory is ~10-20MB, which is fine. Rendering is the bottleneck.
    const all = await db.getAll(GOOGLE_STORE);

    const lowerQuery = query.toLowerCase();
    const results: any[] = [];

    for (const c of all) {
        const name = c.names?.[0]?.displayName?.toLowerCase() || '';
        const email = c.emailAddresses?.[0]?.value?.toLowerCase() || '';
        if (name.includes(lowerQuery) || email.includes(lowerQuery)) {
            results.push(c);
            if (results.length >= limit) break; // Stop once we have enough
        }
    }

    return results;
};

export const clearGoogleContacts = async () => {
    const db = await initDB();
    return db.clear(GOOGLE_STORE);
};

export const countGoogleContacts = async (): Promise<number> => {
    const db = await initDB();
    return db.count(GOOGLE_STORE);
};

// --- NOTES OPERATIONS ---

export const addNote = async (note: Note) => {
    const db = await initDB();
    await db.put('notes', note);
};

export const getNotes = async (): Promise<Note[]> => {
    const db = await initDB();
    return db.getAllFromIndex('notes', 'by-date');
};

export const deleteNote = async (id: string) => {
    const db = await initDB();
    await db.delete('notes', id);
};

export const searchNotes = async (query: string): Promise<Note[]> => {
    const db = await initDB();
    const all = await db.getAllFromIndex('notes', 'by-date');

    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    if (terms.length === 0) return all.reverse();

    return all.filter(n => {
        const text = `${n.content} ${n.contactName || ''} ${n.tags?.join(' ') || ''}`.toLowerCase();
        // All terms must be present (AND logic)
        return terms.every(term => text.includes(term));
    }).reverse();
};

// --- HISTORY OPERATIONS ---

const generateKeywords = (item: HistoryItem): string[] => {
    const parts: string[] = [item.name, item.org || ''];

    // Parse vCard to get hidden fields
    if (item.vcard) {
        const parsed = parseVCardString(item.vcard);
        const d = parsed.data;

        if (d.title) parts.push(d.title);
        if (d.role) parts.push(d.role);
        if (d.note) parts.push(d.note);

        d.email?.forEach(e => parts.push(e.value));
        d.tel?.forEach(t => parts.push(t.value));
        d.url?.forEach(u => parts.push(u.value));

        d.adr?.forEach(a => {
            parts.push(a.value.street);
            parts.push(a.value.city);
            parts.push(a.value.zip);
            parts.push(a.value.region);
            parts.push(a.value.country);
        });
    }

    const text = parts.join(' ').toLowerCase();
    // Split by space, remove empty, remove short words (<2 chars)
    return [...new Set(text.split(/[\s,.-]+/).filter(w => w.length > 1))];
};

export const addHistoryItem = async (item: HistoryItem) => {
    const db = await initDB();

    // Generate search keywords
    item.keywords = generateKeywords(item);

    // Convert Base64 images to Blobs for storage efficiency
    // DISABLED: Causing "Error preparing Blob/File data" on some browsers (Safari/Mac).
    // Reverting to Base64 string storage for stability.
    // if (item.images && item.images.length > 0) {
    //     const blobImages = item.images.map(img => {
    //         if (typeof img === 'string' && img.startsWith('data:image')) {
    //             try {
    //                 return base64ToBlob(img);
    //             } catch (e) {
    //                 console.error("Failed to convert image to blob", e);
    //                 return null; // Skip invalid image
    //             }
    //         }
    //         return img;
    //     }).filter(img => img !== null); // Remove failed conversions

    //     // We need to cast because HistoryItem type definition might still say string[]
    //     // In a real app, we should update the type definition to string | Blob
    //     // For now, IDB handles mixed types fine.
    //     item.images = blobImages as any;
    // }

    return db.put(STORE_NAME, item);
};

export const addHistoryItems = async (items: HistoryItem[]) => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Generate keywords for all items
    // This is CPU intensive, so we might want to do it in chunks or before calling this
    // But for DB consistency, we do it here.
    for (const item of items) {
        item.keywords = generateKeywords(item);
        store.put(item);
    }

    return tx.done;
};

export const getHistory = async (): Promise<HistoryItem[]> => {
    const db = await initDB();
    const items = await db.getAllFromIndex(STORE_NAME, 'by-date');
    return items.reverse();
};

export const getHistoryPaged = async (limit: number, lastTimestamp?: number, excludeImages = false): Promise<HistoryItem[]> => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('by-date');

    let range: IDBKeyRange | null = null;
    if (lastTimestamp) {
        // Fetch items OLDER than the last one (descending order)
        // upperOpen: true means strictly less than lastTimestamp
        range = IDBKeyRange.upperBound(lastTimestamp, true);
    }

    let cursor = await index.openCursor(range, 'prev'); // 'prev' = descending
    const items: HistoryItem[] = [];

    while (cursor && items.length < limit) {
        const item = cursor.value;

        // Optimization: Remove images from list view to save memory
        if (excludeImages) {
            delete item.images;
        }

        items.push(item);
        cursor = await cursor.continue();
    }

    return items;
};

export const getHistoryItemImages = async (id: string): Promise<(string | Blob)[] | undefined> => {
    const item = await getHistoryItem(id);
    return item?.images;
};

export const getHistoryItem = async (id: string): Promise<HistoryItem | undefined> => {
    const db = await initDB();
    return db.get(STORE_NAME, id);
};

export const deleteHistoryItem = async (id: string) => {
    const db = await initDB();
    return db.delete(STORE_NAME, id);
};

export const clearHistory = async () => {
    const db = await initDB();
    return db.clear(STORE_NAME);
};

export const countHistory = async (): Promise<number> => {
    const db = await initDB();
    return db.count(STORE_NAME);
};


export const migrateFromLocalStorage = async () => {
    const LOCAL_STORAGE_KEY = 'vcard_history';
    const rawData = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (rawData) {
        try {
            const items: HistoryItem[] = JSON.parse(rawData);
            if (Array.isArray(items) && items.length > 0) {
                console.log(`Migrating ${items.length} items from localStorage to IndexedDB...`);
                const db = await initDB();
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);

                for (const item of items) {
                    await store.put(item);
                }

                await tx.done;
                console.log('Migration successful. Clearing localStorage.');
                localStorage.removeItem(LOCAL_STORAGE_KEY);
                return true; // Migration happened
            }
        } catch (error) {
            console.error('Failed to migrate history from localStorage:', error);
        }
    }
    return false; // No migration needed or failed
};

export const migrateBase64ToBlob = async () => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    let cursor = await store.openCursor();
    let count = 0;

    while (cursor) {
        const item = cursor.value;
        let changed = false;

        if (item.images && item.images.length > 0) {
            const newImages = item.images.map((img: any) => {
                if (typeof img === 'string' && img.startsWith('data:image')) {
                    changed = true;
                    return base64ToBlob(img);
                }
                return img;
            });

            if (changed) {
                item.images = newImages;
                await cursor.update(item);
                count++;
            }
        }
        cursor = await cursor.continue();
    }

    await tx.done;
    if (count > 0) {
        console.log(`Optimized ${count} history items to Blob storage.`);
    }
};

export const searchHistory = async (query: string): Promise<HistoryItem[]> => {
    const db = await initDB();
    const terms = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);  // ✅ Changed from > 1 to > 0 to allow single-char searches

    if (terms.length === 0) return getHistoryPaged(20);

    // ✅ For TRUE substring search (e.g. "rea" finding "Andreas"),
    // we need to scan ALL items since IndexedDB range queries only work for prefixes.
    // This is acceptable performance for < 10k contacts.
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('by-date');

    const uniqueItems = new Map<string, HistoryItem>();
    let cursor = await index.openCursor(null, 'prev'); // All items, newest first

    while (cursor && uniqueItems.size < 50) { // Limit results to 50
        const item = cursor.value;
        const itemKeywords = item.keywords || [];

        // Check if ALL search terms are found as substrings in ANY keyword
        const allTermsMatch = terms.every(term =>
            itemKeywords.some(k => k.includes(term))
        );

        if (allTermsMatch) {
            // Optimization: Remove images from search results to save memory
            delete item.images;
            uniqueItems.set(item.id, item);
        }

        cursor = await cursor.continue();
    }

    return Array.from(uniqueItems.values());
};

export const migrateKeywords = async () => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    let cursor = await tx.store.openCursor();

    while (cursor) {
        const item = cursor.value;
        if (!item.keywords) {
            item.keywords = generateKeywords(item);
            await cursor.update(item);
        }
        cursor = await cursor.continue();
    }
    await tx.done;
};

// --- Failed Scans Helpers ---

export const addFailedScan = async (scan: FailedScan) => {
    const db = await initDB();
    await db.put('failed_scans', scan);
};

export const getFailedScans = async (): Promise<FailedScan[]> => {
    const db = await initDB();
    return db.getAllFromIndex('failed_scans', 'by-date');
};

export const deleteFailedScan = async (id: string) => {
    const db = await initDB();
    await db.delete('failed_scans', id);
};



export const countStreets = async (): Promise<number> => {
    const db = await initDB();
    return db.count(STREETS_STORE);
};

export const addStreets = async (streets: Omit<Street, 'id'>[]) => {
    const db = await initDB();
    const tx = db.transaction(STREETS_STORE, 'readwrite');
    const store = tx.objectStore(STREETS_STORE);

    // Use Promise.all for parallel adds? Or just loop.
    // Loop is safer for transaction.
    for (const street of streets) {
        store.put(street);
    }
    return tx.done;
};

export const getStreetsByZip = async (zip: string): Promise<string[]> => {
    const db = await initDB();
    const index = db.transaction(STREETS_STORE).store.index('zip');
    const streets = await index.getAll(zip);
    return streets.map(s => s.name);
};
