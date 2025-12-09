import init, { SearchIndex } from '../src/wasm/vcard_wasm.js';
import { initDB } from '../utils/db';
import { HistoryItem } from '../types';

const STORE_NAME = 'history';
let searchIndex: SearchIndex | null = null;
let isInitialized = false;

// We need to keep a map of ID -> Item to return full objects purely from worker if needed,
// OR we just return IDs and let main thread fetch.
// Given 1000 items, returning IDs is cleaner, BUT `Virtuoso` usually expects full items.
// For speed, let's keep a full item cache in JS as well.
const itemCache = new Map<string, HistoryItem>();

const initialize = async () => {
    if (isInitialized) return;

    try {
        await init();
        searchIndex = new SearchIndex();

        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        let cursor = await tx.store.openCursor();

        let count = 0;
        while (cursor) {
            const item = cursor.value;

            // OPTIMIZATION FOR 25k ITEMS:
            // Do NOT cache images in the search worker. 
            // 25,000 items * 500KB image = 12GB RAM -> CRASH.
            // 25,000 items * 1KB text = 25MB RAM -> SAFE.
            const { images, ...itemWithoutImages } = item;

            // We use 'as any' safe cast or just assert type if we make images optional
            itemCache.set(item.id, itemWithoutImages as HistoryItem);

            // Add to Rust Index
            // Combine keywords array into string for simple API
            const keywords = (item.keywords || []).join(' ');
            searchIndex!.add(
                item.id,
                item.name || '',
                item.org || '',
                keywords
            );

            count++;
            cursor = await cursor.continue();
        }

        console.log(`[SearchWorker] Index built with ${count} items.`);
        isInitialized = true;
        self.postMessage({ type: 'ready' });

    } catch (e) {
        console.error("Search Worker Init Failed", e);
        self.postMessage({ type: 'error', error: String(e) });
    }
};

initialize();

self.onmessage = async (e: MessageEvent) => {
    const { type, query } = e.data;

    if (type === 'search') {
        if (!isInitialized || !searchIndex) {
            // Fallback or wait?
            // If very early, maybe just return empty or recent.
            // Let's retry init if missing?
            await initialize();
        }

        try {
            if (!query || query.trim().length === 0) {
                // Return recent 50
                const recent = Array.from(itemCache.values())
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 50);
                self.postMessage({ type: 'results', results: recent });
                return;
            }

            // Rust Search
            // Returns JSON string of IDs
            const jsonIds = searchIndex!.search(query);
            const ids: string[] = JSON.parse(jsonIds);

            // Map back to objects
            const results = ids
                .map(id => itemCache.get(id))
                .filter(item => item !== undefined) as HistoryItem[];

            self.postMessage({ type: 'results', results });
        } catch (error: any) {
            self.postMessage({ type: 'error', error: error.message });
        }
    } else if (type === 'refresh') {
        // Reload one or all?
        // Ideally we support incremental add.
        // For now, full rebuild is safest to sync DB.
        if (searchIndex) {
            searchIndex.clear();
            itemCache.clear();
            isInitialized = false;
            initialize();
        }
    }
};
