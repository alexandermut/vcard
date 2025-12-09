import React from 'react';
import { Loader2, CheckCircle2, AlertCircle, Layers, X } from 'lucide-react';
import { ScanJob, Language } from '../types';
import { translations } from '../utils/translations';

interface QueueIndicatorProps {
  queue: ScanJob[];
  failedCount: number;
  lang: Language;
  onOpenQueue: () => void;
  onClearErrors: () => void;
  onOpenFailedScans: () => void;
}

export const QueueIndicator: React.FC<QueueIndicatorProps> = ({ queue, failedCount, lang, onOpenQueue, onClearErrors, onOpenFailedScans }) => {
  const t = translations[lang];
  const pending = queue.filter(j => j.status === 'pending').length;
  const processing = queue.filter(j => j.status === 'processing').length;
  const errors = queue.filter(j => j.status === 'error').length;

  const [elapsedTime, setElapsedTime] = React.useState(0);
  const startTimeRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;

    if (processing > 0) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now() - elapsedTime * 1000; // Resume or Start
      }

      interval = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (pending === 0) {
        // Reset when fully done
        startTimeRef.current = null;
        setElapsedTime(0);
      }
      // If pending > 0 but processing = 0 (paused?), we keep timer? 
      // Actually usually processing > 0 is the trigger.
    }

    return () => clearInterval(interval);
  }, [processing, pending]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (queue.length === 0 && failedCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 animate-in slide-in-from-right-4 fade-in">
      <div
        onClick={onOpenQueue}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg p-3 flex items-center gap-3 min-w-[200px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors group"
      >

        <div className="relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${errors > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'}`}>
            {processing > 0 ? <Loader2 size={20} className="animate-spin" /> : errors > 0 ? <AlertCircle size={20} /> : <Layers size={20} />}
          </div>
          {errors > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></div>
          )}
          {failedCount > 0 && errors === 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-2 border-white dark:border-slate-800"></div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex justify-between items-center mb-0.5">
            <p className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              {t.batchQueue}
            </p>
            {processing > 0 && (
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 rounded">
                {formatTime(elapsedTime)}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col">
            {processing > 0 && <span>{t.processing}: {processing}</span>}
            {pending > 0 && <span>{t.waiting}: {pending}</span>}
            {errors > 0 && <span className="text-red-500 font-medium">{errors} {t.errors}</span>}
            {failedCount > 0 && (
              <span
                onClick={(e) => { e.stopPropagation(); onOpenFailedScans(); }}
                className="text-red-600 font-bold hover:underline cursor-pointer"
              >
                {failedCount} Fehlgeschlagen
              </span>
            )}
          </div>
        </div>

        {errors > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearErrors();
            }}
            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-600 rounded-full transition-colors"
            title="Fehler löschen"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};