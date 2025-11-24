import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { HistoryItem } from '../types';
import { base64ToBlob } from './imageUtils';
import { parseVCardString } from './vcardUtils';

interface VCardDB extends DBSchema {
    history: {
        key: string;
        value: HistoryItem;
        indexes: {
            'by-date': number;
            'keywords': string[];
        };
    };
}

const DB_NAME = 'vcard-db';
const DB_VERSION = 2;
const STORE_NAME = 'history';

let dbPromise: Promise<IDBPDatabase<VCardDB>>;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<VCardDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion, newVersion, transaction) {
                // Version 1: Create store and date index
                if (oldVersion < 1) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('by-date', 'timestamp');
                }

                // Version 2: Add keywords index
                if (oldVersion < 2) {
                    const store = transaction.objectStore(STORE_NAME);
                    if (!store.indexNames.contains('keywords')) {
                        store.createIndex('keywords', 'keywords', { multiEntry: true });
                    }
                }
            },
        });
    }
    return dbPromise;
};

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
    if (item.images && item.images.length > 0) {
        const blobImages = item.images.map(img => {
            if (typeof img === 'string' && img.startsWith('data:image')) {
                return base64ToBlob(img);
            }
            return img;
        });
        // We need to cast because HistoryItem type definition might still say string[]
        // In a real app, we should update the type definition to string | Blob
        // For now, IDB handles mixed types fine.
        item.images = blobImages as any;
    }

    return db.put(STORE_NAME, item);
};

export const getHistory = async (): Promise<HistoryItem[]> => {
    const db = await initDB();
    const items = await db.getAllFromIndex(STORE_NAME, 'by-date');
    return items.reverse();
};

export const getHistoryPaged = async (limit: number, lastTimestamp?: number): Promise<HistoryItem[]> => {
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

        // Convert stored Blobs back to ObjectURLs for display
        if (item.images && item.images.length > 0) {
            item.images = item.images.map((img: any) => {
                if (img instanceof Blob) {
                    return URL.createObjectURL(img);
                }
                return img;
            });
        }

        items.push(item);
        cursor = await cursor.continue();
    }

    return items;
};

export const deleteHistoryItem = async (id: string) => {
    const db = await initDB();
    return db.delete(STORE_NAME, id);
};

export const clearHistory = async () => {
    const db = await initDB();
    return db.clear(STORE_NAME);
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
    const terms = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);

    if (terms.length === 0) return getHistoryPaged(20);

    // Strategy: Use the first term to get candidates from the index,
    // then filter in memory for the rest.
    // IndexedDB only supports exact match on multiEntry.
    // So we can't easily do prefix search (e.g. "Ale" -> "Alexander") efficiently with just this index
    // UNLESS we index all prefixes (too heavy).
    //
    // ALTERNATIVE: Since we want "Database Search", we usually mean "Full Text Search".
    // But IDB is limited.
    //
    // HYBRID APPROACH:
    // If we want "contains" search, we might have to scan.
    // But let's try to use the index for at least exact word matches if possible.
    //
    // ACTUALLY: For a contact list (< 10k items), scanning ALL items (just the keywords/names) is often fast enough.
    // But we want to use the DB.
    //
    // Let's implement a "Filter" approach using a cursor on the 'by-date' index (so we get sorted results)
    // and filtering manually. This is robust for "contains" search.
    //
    // Wait, the user asked for "Database-based Search".
    // Using `keywords` index is good for exact tags.
    //
    // Let's stick to the plan: Use `keywords` index.
    // But `multiEntry` only matches EXACT keys.
    // So "Alex" will NOT find "Alexander" if we only indexed "alexander".
    //
    // To make it user friendly, let's index prefixes too? No, too much data.
    //
    // Let's fallback to a robust SCAN for now, but optimized.
    // We fetch all, but only the fields we need? No, IDB fetches whole objects.
    //
    // Let's use the `keywords` index for what it's good at: Exact matches.
    // But users type prefixes.
    //
    // REVISED STRATEGY for "Database Search":
    // We will use a cursor to iterate over the entire store (sorted by date) and filter.
    // This IS a database search (it happens on the DB thread if we use a cursor properly?).
    // No, it happens in JS.
    //
    // If we really want to use the index, we need to query `IDBKeyRange.bound(term, term + '\uffff')`.
    // This works for prefix search on a normal index.
    // Does it work on multiEntry? Yes!
    //
    // So: For query "Ale", we search the `keywords` index for range "Ale" to "Ale\uffff".
    // This gives us all IDs that have a keyword starting with "Ale".
    // Then we fetch those items.

    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('keywords');

    // We only use the first term for the index query to narrow down
    const firstTerm = terms[0];
    const range = IDBKeyRange.bound(firstTerm, firstTerm + '\uffff');

    let cursor = await index.openKeyCursor(range); // Get keys (IDs) only first? No, we need values.
    // Actually, getting unique values is tricky with multiEntry because one item appears multiple times.

    const uniqueItems = new Map<string, HistoryItem>();

    // We'll use openCursor to get values directly
    let valueCursor = await index.openCursor(range);

    while (valueCursor && uniqueItems.size < 50) { // Limit results
        const item = valueCursor.value;

        // Verify ALL terms match (in memory filter for the rest)
        const itemKeywords = item.keywords || [];
        const allTermsMatch = terms.every(term =>
            itemKeywords.some(k => k.startsWith(term))
        );

        if (allTermsMatch) {
            // Convert Blobs for display
            if (item.images && item.images.length > 0) {
                item.images = item.images.map((img: any) => {
                    if (img instanceof Blob) return URL.createObjectURL(img);
                    return img;
                });
            }
            uniqueItems.set(item.id, item);
        }

        valueCursor = await valueCursor.continue();
    }

    return Array.from(uniqueItems.values());
};

export const migrateKeywords = async () => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    let cursor = await store.openCursor();
    let count = 0;

    while (cursor) {
        const item = cursor.value;
        // Always regenerate keywords to ensure new fields are indexed
        const newKeywords = generateKeywords(item);

        // Only update if changed (simple length check or deep compare could be better, but overwriting is safe)
        if (JSON.stringify(item.keywords) !== JSON.stringify(newKeywords)) {
            item.keywords = newKeywords;
            await cursor.update(item);
            count++;
        }
        cursor = await cursor.continue();
    }
    await tx.done;
    if (count > 0) {
        console.log(`Added search keywords to ${count} items.`);
    }
};
