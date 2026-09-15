import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, Volume2, VolumeX, Sparkles, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  sampleBarcodes?: Array<{ barcode: string; name: string }>;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  sampleBarcodes = [],
}) => {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'barcode-scanner-viewport';

  // Sound beep using Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.log('Audio playback error', e);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // Get cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices as unknown as MediaDeviceInfo[]);
          // Prefer back / environment camera
          const backCamera = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          const defaultId = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(defaultId);
          startScanner(defaultId);
        } else {
          setErrorMsg('لم يتم العثور على كاميرا في هذا الجهاز.');
        }
      })
      .catch((err) => {
        console.warn('Camera enumeration error:', err);
        setErrorMsg('تعذر الوصول للكاميرا. يرجى التأكد من إعطاء إذن استخدام الكاميرا.');
      });

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async (cameraId: string) => {
    setErrorMsg(null);
    try {
      if (html5QrCodeRef.current) {
        await stopScanner();
      }

      const html5QrCode = new Html5Qrcode(containerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.7777,
        },
        (decodedText) => {
          playBeep();
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          onScan(decodedText.trim());
          stopScanner();
          onClose();
        },
        () => {
          // Frame parse failure is normal while searching for barcode
        }
      );
      setIsScanning(true);
    } catch (err: unknown) {
      console.error('Failed to start scanner:', err);
      setIsScanning(false);
      setErrorMsg(
        'تعذر تشغيل الكاميرا داخل هذا الإطار، أو تم رفض إذن الكاميرا. يمكنك استخدام الأكواد التجريبية أو إدخال الباركود يدوياً.'
      );
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startScanner(newId);
  };

  if (!isOpen) return null;

  return (
    <div
      id="barcode-scanner-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="barcode-scanner-modal-content"
        className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-stone-100">مسح الباركود بالكاميرا</h3>
              <p className="text-xs text-stone-400">وجه الكاميرا نحو باركود السلعة لقراءته فوراً</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'كتم صوت الصافرة' : 'تفعيل صوت الصافرة'}
              className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
            </button>
            <button
              type="button"
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-2 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Viewport */}
        <div className="relative bg-black flex-1 min-h-[260px] flex items-center justify-center overflow-hidden">
          <div id={containerId} className="w-full h-full min-h-[260px]" />

          {/* Scanner Overlay Guide */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="relative w-64 h-36 border-2 border-emerald-400/80 rounded-lg shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                {/* Animated scan line */}
                <div className="absolute inset-x-0 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse top-1/2" />
                <div className="absolute top-1 left-2 text-[10px] text-emerald-400 font-mono tracking-wider">
                  EAN / UPC SCANNER
                </div>
              </div>
              <p className="mt-3 text-xs text-stone-300 bg-stone-950/70 px-3 py-1 rounded-full border border-stone-800">
                ثبّت الباركود داخل المربع المستطيل
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-6 text-center max-w-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Camera Selector and Controls */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 space-y-3">
          {cameras.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="camera-select" className="text-xs text-stone-400 whitespace-nowrap">
                اختر الكاميرا:
              </label>
              <select
                id="camera-select"
                value={selectedCameraId}
                onChange={handleCameraChange}
                className="w-full text-xs bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-emerald-500"
              >
                {cameras.map((cam, idx) => (
                  <option key={cam.deviceId || idx} value={cam.deviceId}>
                    {cam.label || `كاميرا ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Simulation / Test Barcodes */}
          {sampleBarcodes.length > 0 && (
            <div className="pt-2 border-t border-stone-800/80">
              <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>أو جرّب محاكاة قراءة باركود بنقرة واحدة:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {sampleBarcodes.slice(0, 5).map((s) => (
                  <button
                    key={s.barcode}
                    type="button"
                    onClick={() => {
                      playBeep();
                      onScan(s.barcode);
                      stopScanner();
                      onClose();
                    }}
                    className="text-xs bg-stone-900 hover:bg-emerald-900/40 hover:text-emerald-300 hover:border-emerald-700/60 border border-stone-800 rounded-md px-2.5 py-1 text-stone-300 transition-colors flex items-center gap-1.5"
                  >
                    <span className="font-mono font-medium text-[11px] text-emerald-400">{s.barcode}</span>
                    <span className="truncate max-w-[120px] text-stone-400 text-[11px]">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
