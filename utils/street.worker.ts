import { openDB } from 'idb';

const DB_NAME = 'vcard-db';
const DB_VERSION = 7;
const STREETS_STORE = 'streets';

// Define minimal DB interface for the worker
interface Street {
    name: string;
    zip: string;
    city: string;
}

// Open DB (Standalone for Worker)
const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            // We assume the main thread has already created the DB/Store via App.tsx -> initDB
            // But if the worker runs first (unlikely), we might need this.
            // However, usually upgrade logic is centralized. 
            // Let's just hope the store exists. If not, we can't do much.
            // Actually, to be safe, we should replicate the schema or ensure main thread inits first.
            if (oldVersion < 3) {
                const store = db.createObjectStore(STREETS_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('zip', 'zip');
                store.createIndex('name', 'name');
            }
        },
    });
};

self.onmessage = async (e) => {
    const data = e.data;
    if (data === 'start' || (typeof data === 'object' && data.type === 'start')) {
        try {
            const url = (typeof data === 'object' && data.url) ? data.url : '/streets.csv';
            await startIngestion(url);
        } catch (err: any) {
            self.postMessage({ type: 'error', error: err.message });
        }
    }
};

async function startIngestion(csvUrl: string) {
    const db = await initDB();

    // Check if already populated
    const count = await db.count(STREETS_STORE);
    if (count > 0) {
        self.postMessage({ type: 'progress', percent: 100, message: 'Streets already loaded.' });
        self.postMessage({ type: 'done' });
        return;
    }

    self.postMessage({ type: 'progress', percent: 0, message: 'Downloading street database...' });

    const response = await fetch(csvUrl);
    if (!response.body) throw new Error('ReadableStream not supported');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    // Get total size for progress
    const contentLength = response.headers.get('Content-Length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
    let receivedBytes = 0;

    let buffer = '';
    let batch: Street[] = [];
    const BATCH_SIZE = 2000;

    // Regex: """Name""",Zip,City
    const re_line = /^"""(.*?)""",(\d+),([^,]+)/;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        receivedBytes += value.length;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        // Keep the last line in buffer as it might be incomplete
        buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Skip header if it looks like one (Name,PostalCode...)
            if (trimmed.startsWith('Name,PostalCode')) continue;

            const match = trimmed.match(re_line);
            if (match) {
                batch.push({
                    name: match[1].trim(),
                    zip: match[2],
                    city: match[3]
                });
            }

            if (batch.length >= BATCH_SIZE) {
                const tx = db.transaction(STREETS_STORE, 'readwrite');
                const store = tx.objectStore(STREETS_STORE);
                for (const item of batch) {
                    store.put(item);
                }
                await tx.done;
                batch = [];

                // Report progress
                if (totalBytes > 0) {
                    const percent = Math.min(99, Math.floor((receivedBytes / totalBytes) * 100));
                    self.postMessage({
                        type: 'progress',
                        percent,
                        message: `Importing... ${Math.round(receivedBytes / 1024 / 1024)}MB / ${Math.round(totalBytes / 1024 / 1024)}MB`
                    });
                }
            }
        }
    }

    // Process remaining buffer
    if (buffer.trim()) {
        const match = buffer.trim().match(re_line);
        if (match) {
            batch.push({ name: match[1].trim(), zip: match[2], city: match[3] });
        }
    }

    // Final batch
    if (batch.length > 0) {
        const tx = db.transaction(STREETS_STORE, 'readwrite');
        const store = tx.objectStore(STREETS_STORE);
        for (const item of batch) {
            store.put(item);
        }
        await tx.done;
    }

    self.postMessage({ type: 'progress', percent: 100, message: 'Street database ready.' });
    self.postMessage({ type: 'done' });
}
