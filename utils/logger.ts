export interface LogEntry {
    timestamp: string;
    type: 'click' | 'console' | 'error' | 'info' | 'navigation';
    level?: 'log' | 'warn' | 'error' | 'debug';
    message: string;
    data?: any;
}

class Logger {
    private logs: LogEntry[] = [];
    private maxLogs: number = 1000;
    private listeners: ((logs: LogEntry[]) => void)[] = [];

    add(entry: Omit<LogEntry, 'timestamp'>) {
        const newEntry: LogEntry = {
            timestamp: new Date().toISOString(),
            ...entry
        };

        this.logs.push(newEntry);

        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        this.notify();
    }

    getLogs() {
        return this.logs;
    }

    clear() {
        this.logs = [];
        this.notify();
    }

    subscribe(listener: (logs: LogEntry[]) => void) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l(this.logs));
    }

    export() {
        return JSON.stringify(this.logs, null, 2);
    }
}

export const logger = new Logger();
