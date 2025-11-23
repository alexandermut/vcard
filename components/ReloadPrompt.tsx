import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export const ReloadPrompt: React.FC = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: ServiceWorkerRegistration | undefined) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error: any) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) return null;

    return (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 p-4 bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 animate-in slide-in-from-bottom-4 duration-300 max-w-sm">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    {offlineReady ? (
                        <p className="text-sm font-medium">App ready to work offline</p>
                    ) : (
                        <p className="text-sm font-medium">New content available, click on reload button to update.</p>
                    )}
                </div>
                <button onClick={close} className="text-slate-400 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>

            {needRefresh && (
                <button
                    className="mt-2 flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold transition-colors"
                    onClick={() => updateServiceWorker(true)}
                >
                    <RefreshCw size={14} />
                    Reload
                </button>
            )}
        </div>
    );
};
