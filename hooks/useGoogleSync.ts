import { useState, useEffect, useRef, useCallback } from 'react';
import { useGoogleContactsAuth } from '../auth/useGoogleContactsAuth';
import { fetchGoogleContacts } from '../services/googleContactsService';
import { addGoogleContacts, countGoogleContacts, clearGoogleContacts } from '../utils/db';

export const useGoogleSync = () => {
    const { token, isAuthenticated } = useGoogleContactsAuth();
    const [status, setStatus] = useState<'idle' | 'syncing' | 'completed' | 'error'>('idle');
    const [progress, setProgress] = useState(0);
    const [total, setTotal] = useState(0);
    const [lastLog, setLastLog] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Load initial count
    useEffect(() => {
        countGoogleContacts().then(setTotal);
    }, []);

    const startSync = useCallback(async (force = false) => {
        if (!token) {
            setLastLog("Start failed: No token");
            return;
        }
        if (status === 'syncing' && !force) return;

        setStatus('syncing');
        setError(null);
        setLastLog("Starting sync...");

        if (force) {
            setLastLog("Clearing local DB...");
            await clearGoogleContacts();
            setProgress(0);
            setTotal(0);
        }

        abortControllerRef.current = new AbortController();

        let pageToken: string | undefined = undefined;
        let count = 0;

        try {
            do {
                if (abortControllerRef.current?.signal.aborted) {
                    setLastLog("Sync aborted by user.");
                    break;
                }

                setLastLog(`Fetching page... (Token: ${pageToken ? 'Yes' : 'No'})`);
                const response = await fetchGoogleContacts(token, pageToken, abortControllerRef.current.signal);

                if (response.connections && response.connections.length > 0) {
                    setLastLog(`Fetched ${response.connections.length}. Saving to DB...`);
                    try {
                        await addGoogleContacts(response.connections);
                        setLastLog(`Saved ${response.connections.length} contacts.`);
                    } catch (dbErr: any) {
                        console.error("DB Save Error", dbErr);
                        throw new Error(`DB Error: ${dbErr.message}`);
                    }

                    count += response.connections.length;
                    setProgress(count);
                    setTotal(prev => Math.max(prev, count)); // Update total if we find more
                } else {
                    setLastLog("Page empty.");
                }

                pageToken = response.nextPageToken;

                // Throttle to be nice to the API
                await new Promise(resolve => setTimeout(resolve, 1000));

            } while (pageToken);

            setStatus('completed');
            const finalCount = await countGoogleContacts();
            setTotal(finalCount);
            setLastLog("Sync completed successfully.");

        } catch (e: any) {
            if (e.name === 'AbortError') {
                setLastLog("Sync stopped by user.");
                setStatus('idle');
            } else {
                console.error("Sync failed", e);
                setError(e.message);
                setLastLog(`Error: ${e.message}`);
                setStatus('error');
            }
        }
    }, [token, status]);

    const stopSync = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setStatus('idle');
            setLastLog("Stopped by user.");
        }
    }, []);

    return {
        status,
        progress,
        total,
        error,
        lastLog,
        startSync,
        stopSync
    };
};
