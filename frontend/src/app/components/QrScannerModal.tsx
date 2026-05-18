import { useEffect, useRef, useState } from 'react';
import { X, QrCode, AlertCircle, Loader2 } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
}

declare class BarcodeDetector {
  static getSupportedFormats(): Promise<string[]>;
  constructor(options?: { formats: string[] });
  detect(image: ImageBitmapSource): Promise<{ rawValue: string; format: string }[]>;
}

export default function QrScannerModal({ isOpen, onClose, onScan }: QrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'scanning' | 'error' | 'unsupported'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStatus('loading');
      setErrorMsg('');
      startCamera();
    }
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const startCamera = async () => {
    // Check BarcodeDetector support
    if (!('BarcodeDetector' in window)) {
      setStatus('unsupported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setStatus('scanning');
          startScanning();
        };
      }
    } catch {
      setStatus('error');
      setErrorMsg('No se pudo acceder a la cámara. Verifique los permisos del navegador.');
    }
  };

  const startScanning = () => {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const value = barcodes[0].rawValue;
          stopCamera();
          onScan(value);
          onClose();
        }
      } catch {
        // continue scanning
      }
    }, 300);
  };

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 flex items-center justify-center p-4" onClick={handleClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <QrCode size={20} className="text-[#00a6d6]" />
            <span className="font-semibold text-gray-900 dark:text-white">Escanear código QR</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {status === 'unsupported' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <AlertCircle size={28} className="text-yellow-500" />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 max-w-xs">
                Su navegador no soporta el escáner de códigos QR. Use Chrome o Edge actualizados, o ingrese el número de serie manualmente.
              </p>
              <button
                onClick={handleClose}
                className="mt-1 px-4 py-2 bg-[#00a6d6] text-white text-sm rounded-lg hover:bg-[#008bb8] transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle size={28} className="text-red-500" />
              </div>
              <p className="text-sm text-red-600 dark:text-red-400 max-w-xs">{errorMsg}</p>
              <button
                onClick={() => { setStatus('loading'); startCamera(); }}
                className="mt-1 px-4 py-2 bg-[#00a6d6] text-white text-sm rounded-lg hover:bg-[#008bb8] transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

          {(status === 'loading' || status === 'scanning') && (
            <div className="relative">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />

                {status === 'loading' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 gap-2">
                    <Loader2 size={32} className="text-[#00a6d6] animate-spin" />
                    <p className="text-sm text-white">Iniciando cámara...</p>
                  </div>
                )}

                {status === 'scanning' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-48 h-48">
                      <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-[#00a6d6] rounded-tl-sm" />
                      <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-[#00a6d6] rounded-tr-sm" />
                      <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-[#00a6d6] rounded-bl-sm" />
                      <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-[#00a6d6] rounded-br-sm" />
                    </div>
                  </div>
                )}
              </div>

              {status === 'scanning' && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Escaneando — apunte al código QR del número de serie
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
