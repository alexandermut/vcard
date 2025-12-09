import { useEffect, useRef, useState, useCallback } from 'react';
import { HistoryItem, Note } from '../types';

export const useSearchWorker = () => {
    const workerRef = useRef<Worker | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [searchResults, setSearchResults] = useState<HistoryItem[]>([]);
    const [notesResults, setNotesResults] = useState<Note[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        // Initialize Worker
        workerRef.current = new Worker(new URL('../workers/search.worker.ts', import.meta.url), {
            type: 'module'
        });

        workerRef.current.onmessage = (e) => {
            const { type, results, error } = e.data;
            if (type === 'ready') {
                setIsReady(true);
                console.log('🔍 Search Worker Ready');
            } else if (type === 'results') {
                setSearchResults(results);
                setIsSearching(false);
            } else if (type === 'notesResults') {
                setNotesResults(results);
                setIsSearching(false);
            } else if (type === 'error') {
                console.error('Search Worker Error:', error);
                setIsSearching(false);
            }
        };

        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    const search = useCallback((query: string) => {
        if (!workerRef.current) return;
        setIsSearching(true);
        workerRef.current.postMessage({ type: 'search', query });
    }, []);

    const searchNotes = useCallback((query: string) => {
        if (!workerRef.current) return;
        setIsSearching(true);
        workerRef.current.postMessage({ type: 'searchNotes', query });
    }, []);

    const refreshIndex = useCallback(() => {
        workerRef.current?.postMessage({ type: 'refresh' });
    }, []);

    return {
        isReady,
        isSearching,
        searchResults,
        notesResults,
        search,
        searchNotes,
        refreshIndex
    };
};

