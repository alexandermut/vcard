import React, { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import QRCode from 'qrcode';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  vcardString: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, vcardString }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-900 dark:text-white">QR Code teilen</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-2 rounded-lg border border-slate-200">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="vCard QR Code" className="w-64 h-64" />
            ) : (
              <div className="w-64 h-64 bg-slate-100 animate-pulse rounded"></div>
            )}
          </div>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Scannen Sie diesen Code mit der Handy-Kamera, um den Kontakt sofort zu speichern.
          </p>

          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download="vcard-qr.png"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Download size={16} />
              QR-Code herunterladen
            </a>
          )}
        </div>
      </div>
    </div>
  );
};