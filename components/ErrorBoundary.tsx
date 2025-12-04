import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    private handleCopyError = () => {
        const { error, errorInfo } = this.state;
        const text = `Error: ${error?.toString()}\n\nStack:\n${errorInfo?.componentStack}`;
        navigator.clipboard.writeText(text);
        alert('Fehlerbericht in die Zwischenablage kopiert.');
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 font-sans">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400 shrink-0">
                            <AlertTriangle size={32} />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2 shrink-0">
                            Upps, da ist etwas schiefgelaufen
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm shrink-0">
                            Die App ist auf einen unerwarteten Fehler gestoßen. Bitte kopieren Sie den Fehlerbericht und senden Sie ihn an den Support.
                        </p>

                        {this.state.error && (
                            <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-lg text-xs font-mono text-left overflow-auto flex-1 min-h-0 mb-6 border border-slate-200 dark:border-slate-800">
                                <p className="text-red-600 dark:text-red-400 font-bold mb-2">
                                    {this.state.error.toString()}
                                </p>
                                <pre className="text-slate-500 dark:text-slate-500 whitespace-pre-wrap">
                                    {this.state.errorInfo?.componentStack || 'Kein Stack Trace verfügbar'}
                                </pre>
                            </div>
                        )}

                        <div className="flex gap-3 shrink-0">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} />
                                App neu laden
                            </button>
                            <button
                                onClick={this.handleCopyError}
                                className="py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                title="Fehlerbericht kopieren"
                            >
                                <Copy size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
