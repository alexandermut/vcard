import React, { useEffect, useState } from 'react';
import { X, Download, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface QRCodeSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    vcardString: string;
}

export const QRCodeSidebar: React.FC<QRCodeSidebarProps> = ({ isOpen, onClose, vcardString }) => {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    useEscapeKey(onClose, isOpen);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (vcardString) {
                QRCode.toDataURL(vcardString, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    }
                })
                    .then(url => setQrDataUrl(url))
                    .catch(err => console.error(err));
            }
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, vcardString]);

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            <div className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-slate-950 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <QrCode size={20} className="text-blue-600 dark:text-blue-400" />
                        QR Code teilen
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center gap-6 custom-scrollbar">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        {qrDataUrl ? (
                            <img src={qrDataUrl} alt="vCard QR Code" className="w-64 h-64" />
                        ) : (
                            <div className="w-64 h-64 bg-slate-100 animate-pulse rounded"></div>
                        )}
                    </div>
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                        Scannen Sie diesen Code mit der Handy-Kamera, um den Kontakt sofort zu speichern.
                    </p>

                    {qrDataUrl && (
                        <a
                            href={qrDataUrl}
                            download="vcard-qr.png"
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-sm font-medium shadow-sm hover:shadow-md"
                        >
                            <Download size={18} />
                            QR-Code herunterladen
                        </a>
                    )}
                </div>

            </div>
        </>
    );
};
