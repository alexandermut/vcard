import init, { SearchIndex } from '../src/wasm/core.js';
import { initDB } from '../utils/db';
import { HistoryItem } from '../types';
import { Note } from '../types'; // Assuming Note type is defined here or needs to be imported

const STORE_NAME = 'history';
const NOTES_STORE = 'notes';
let searchIndex: SearchIndex | null = null;
let notesIndex: SearchIndex | null = null;
let isInitialized = false;

// We need to keep a map of ID -> Item to return full objects purely from worker if needed,
// OR we just return IDs and let main thread fetch.
// Given 1000 items, returning IDs is cleaner, BUT `Virtuoso` usually expects full items.
// For speed, let's keep a full item cache in JS as well.
const itemCache = new Map<string, HistoryItem>();
const noteCache = new Map<string, Note>();

const initialize = async () => {
    if (isInitialized) return;

    try {
        await init();
        searchIndex = new SearchIndex();
        notesIndex = new SearchIndex();

        const db = await initDB();

        // 1. Load History (Contacts)
        {
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
                // Include item.vcard to search ALL fields (Phone, Email, Address, etc.)
                const keywords = (item.keywords || []).join(' ');
                searchIndex!.add(
                    item.id,
                    item.name || '',
                    item.org || '',
                    (keywords + ' ' + (item.vcard || '')).trim()
                );
                count++;
                cursor = await cursor.continue();
            }
            console.log(`[SearchWorker] Contact Index built with ${count} items.`);
        }

        // 2. Load Notes
        {
            // Note: 'notes' store might not exist in old DB versions, so handle carefully
            if (db.objectStoreNames.contains(NOTES_STORE)) {
                const tx = db.transaction(NOTES_STORE, 'readonly');
                let cursor = await tx.store.openCursor();
                let count = 0;
                while (cursor) {
                    const note = cursor.value;
                    noteCache.set(note.id, note);

                    // Add to Note Index
                    // Mapping: name -> contactName, org -> company, keywords -> content + tags + location
                    notesIndex!.add(
                        note.id,
                        note.contactName || '',
                        note.company || '',
                        (note.content + ' ' + (note.tags?.join(' ') || '') + ' ' + (note.location || '')).trim()
                    );
                    count++;
                    cursor = await cursor.continue();
                }
                console.log(`[SearchWorker] Note Index built with ${count} items.`);
            }
        }

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

    if (!isInitialized) {
        // Retry logic or just ignore? Best to queue, but for now just wait a bit?
        // Actually, if we are responsive, UI knows 'isReady'.
        return;
    }

    if (type === 'search') {
        try {
            const resultsJson = searchIndex!.search(query);
            const ids: string[] = JSON.parse(resultsJson);

            // Hydrate from cache
            const results = ids
                .map(id => itemCache.get(id))
                .filter(item => item !== undefined);

            self.postMessage({ type: 'results', results });
        } catch (err) {
            console.error("Worker Search Error", err);
            self.postMessage({ type: 'error', error: String(err) });
        }
    }
    else if (type === 'searchNotes') {
        try {
            const resultsJson = notesIndex!.search(query);
            const ids: string[] = JSON.parse(resultsJson);

            // Hydrate from cache
            const results = ids
                .map(id => noteCache.get(id))
                .filter(note => note !== undefined);

            self.postMessage({ type: 'notesResults', results });
        } catch (err) {
            console.error("Worker Notes Search Error", err);
            self.postMessage({ type: 'error', error: String(err) });
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
