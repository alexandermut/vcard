import React, { createContext, useContext, useEffect, useState } from 'react';
import { logger, LogEntry } from '../utils/logger';

interface LoggerContextType {
    isEnabled: boolean;
    setIsEnabled: (enabled: boolean) => void;
    logs: LogEntry[];
    clearLogs: () => void;
    exportLogs: () => void;
    logCount: number;
}

const LoggerContext = createContext<LoggerContextType | undefined>(undefined);

export const useLogger = () => {
    const context = useContext(LoggerContext);
    if (!context) {
        throw new Error('useLogger must be used within a LoggerProvider');
    }
    return context;
};

export const LoggerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isEnabled, setIsEnabledState] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);

    // Load initial state
    useEffect(() => {
        const saved = localStorage.getItem('debug_logger_enabled');
        if (saved) {
            setIsEnabledState(JSON.parse(saved));
        }
    }, []);

    // Subscribe to logger updates
    useEffect(() => {
        const unsubscribe = logger.subscribe((newLogs) => {
            setLogs([...newLogs]);
        });
        return unsubscribe;
    }, []);

    const setIsEnabled = (enabled: boolean) => {
        setIsEnabledState(enabled);
        localStorage.setItem('debug_logger_enabled', JSON.stringify(enabled));
        if (!enabled) {
            // Optional: Clear logs when disabled? Or keep them?
            // Let's keep them in memory but stop recording.
        }
    };

    // Event Listeners & Console Patching
    useEffect(() => {
        if (!isEnabled) return;

        console.log("Logger: Enabled");

        // 1. Click Listener
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            let elementInfo = target.tagName.toLowerCase();
            if (target.id) elementInfo += `#${target.id}`;
            if (target.className) elementInfo += `.${target.className.split(' ').join('.')}`;

            const text = target.innerText?.substring(0, 20) || '';

            logger.add({
                type: 'click',
                message: `Click on ${elementInfo} ${text ? `("${text}")` : ''}`,
                data: {
                    x: e.clientX,
                    y: e.clientY,
                    path: window.location.pathname
                }
            });
        };

        // 2. Error Listener
        const handleError = (event: ErrorEvent) => {
            logger.add({
                type: 'error',
                level: 'error',
                message: event.message,
                data: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error?.stack
                }
            });
        };

        // 3. Unhandled Rejection
        const handleRejection = (event: PromiseRejectionEvent) => {
            logger.add({
                type: 'error',
                level: 'error',
                message: `Unhandled Rejection: ${event.reason}`,
                data: event.reason
            });
        };

        window.addEventListener('click', handleClick, true); // Capture phase
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        // 4. Console Patching
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = (...args) => {
            logger.add({
                type: 'console',
                level: 'log',
                message: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
                data: args
            });
            originalLog.apply(console, args);
        };

        console.warn = (...args) => {
            logger.add({
                type: 'console',
                level: 'warn',
                message: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
                data: args
            });
            originalWarn.apply(console, args);
        };

        console.error = (...args) => {
            logger.add({
                type: 'console',
                level: 'error',
                message: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '),
                data: args
            });
            originalError.apply(console, args);
        };

        return () => {
            console.log("Logger: Disabled");
            window.removeEventListener('click', handleClick, true);
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);

            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        };
    }, [isEnabled]);

    const clearLogs = () => {
        logger.clear();
    };

    const exportLogs = () => {
        const data = logger.export();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug_log_${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <LoggerContext.Provider value={{ isEnabled, setIsEnabled, logs, clearLogs, exportLogs, logCount: logs.length }}>
            {children}
        </LoggerContext.Provider>
    );
};
