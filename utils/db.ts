import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { HistoryItem } from '../types';

interface VCardDB extends DBSchema {
    history: {
        key: string;
        value: HistoryItem;
        indexes: { 'by-date': number };
    };
}

const DB_NAME = 'vcard-db';
const DB_VERSION = 1;
const STORE_NAME = 'history';

let dbPromise: Promise<IDBPDatabase<VCardDB>>;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<VCardDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('by-date', 'timestamp');
                }
            },
        });
    }
    return dbPromise;
};

export const addHistoryItem = async (item: HistoryItem) => {
    const db = await initDB();
    return db.put(STORE_NAME, item);
};

export const getHistory = async (): Promise<HistoryItem[]> => {
    const db = await initDB();
    // Get all items and sort by timestamp descending (newest first)
    const items = await db.getAllFromIndex(STORE_NAME, 'by-date');
    return items.reverse();
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
