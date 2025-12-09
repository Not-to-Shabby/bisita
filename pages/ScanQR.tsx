
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, X, Loader2, CheckCircle, AlertCircle, Bug, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import confetti from 'canvas-confetti';
import { questsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ScanQR: React.FC = () => {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    reward?: string;
    xpAwarded?: number;
  } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const isScanningRef = useRef(false);
  const { user } = useAuth();

  const pushDebug = (message: string) => {
    setDebugLogs(prev => {
      const next = [`${new Date().toLocaleTimeString()} • ${message}`, ...prev];
      return next.slice(0, 12);
    });
  };

  const handleDecode = (code: string) => {
    if (!code.trim()) return;
    if (isScanningRef.current || scanResult) return;
    isScanningRef.current = true;
    setIsCameraReady(true);
    pushDebug(`Decoded: ${code}`);
    handleScan(code);
  };

  const handleScanEvent = (detected: { rawValue: string }[]) => {
    const value = detected?.[0]?.rawValue;
    if (!value) return;
    handleDecode(value);
  };

  const handleScannerError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Camera error';
    setCameraError(message);
    pushDebug(`Scanner error: ${message}`);
  };

  const handleScan = async (code: string) => {
    if (!code.trim()) return;
    
    setIsProcessing(true);
    pushDebug('Processing scan payload');
    // setScanResult(null); // Don't clear immediately to keep UI stable

    try {
      const response = await questsApi.scan(code);
      
      if (response.data) {
        setScanResult({
          success: true,
          message: response.data.message,
          reward: response.data.reward,
          xpAwarded: response.data.xpAwarded
        });
        pushDebug('Scan accepted by backend');

        // Derive navigation target
        const questTarget = response.data.quest?._id ? `/quest/${response.data.quest._id}` : null;
        const parsedTarget = response.data.nextRoute || questTarget || deriveRouteFromCode(code);
        setRedirectPath(parsedTarget);

        if (response.data.confetti) {
          setShowConfetti(true);
        }
      } else {
        setScanResult({
          success: false,
          message: response.error || 'Invalid QR Code'
        });
        pushDebug(`Scan rejected: ${response.error || 'Invalid QR Code'}`);
      }
    } catch (error) {
      setScanResult({
        success: false,
        message: 'Failed to process QR code'
      });
      pushDebug('Scan request failed');
    } finally {
      setIsProcessing(false);
      isScanningRef.current = false; // Allow scanning again if user resets
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    isScanningRef.current = false;
    setCameraError(null);
    setRedirectPath(null);
    setShowConfetti(false);
    pushDebug('Scanner reset');
  };

  const deriveRouteFromCode = (code: string): string | null => {
    if (!code.includes(':')) return null;
    const [type, id] = code.split(':');
    if (!type || !id) return null;
    const normalized = type.toLowerCase();
    if (normalized === 'attraction') return `/attraction/${id}`;
    if (normalized === 'quest') return `/quest/${id}`;
    if (normalized === 'event') return `/events/${id}`;
    return null;
  };

  useEffect(() => {
    if (!showConfetti) return;
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0ea5e9', '#f97316', '#22c55e', '#facc15'],
    });
  }, [showConfetti]);

  return (
    <div className="relative h-screen bg-black text-white flex flex-col">
       {/* Camera Feed Container */}
       <div className="absolute inset-0 z-0 w-full h-full bg-black overflow-hidden">
         <Scanner
           onScan={handleScanEvent}
           onError={handleScannerError}
           constraints={{ facingMode: 'environment' }}
           components={{ finder: false, torch: false, zoom: false, onOff: false }}
           classNames={{
             container: 'w-full h-full',
             video: 'object-cover w-full h-full'
           }}
         />
       </div>

       {/* Header */}
       <div className="relative z-10 p-6 pt-12 flex items-center justify-between">
         <button onClick={() => navigate(-1)} className="bg-black/20 backdrop-blur-md p-2 rounded-full">
            <ArrowLeft size={24} />
         </button>
         <span className="font-bold text-lg drop-shadow-md">Scan QR Code</span>
         <div className="w-10 flex justify-end">
           {(user?.role === 'admin') && (
             <button
               onClick={() => setShowDebug(prev => !prev)}
               className="bg-black/30 backdrop-blur-md p-2 rounded-full"
               aria-label="Toggle debug panel"
             >
               <Bug size={18} />
             </button>
           )}
         </div>
       </div>

       {/* Scanner UI Overlay */}
       <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-8 pointer-events-none">
            {scanResult ? (
              <div className="bg-white text-slate-900 p-6 rounded-2xl w-full max-w-xs text-center animate-in fade-in zoom-in duration-300 pointer-events-auto shadow-2xl">
                {scanResult.success ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Success!</h3>
                    <p className="text-slate-600 mb-4">{scanResult.message}</p>
                    {typeof scanResult.xpAwarded === 'number' && (
                      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 mb-4 w-full">
                        <p className="text-xs text-sky-600 font-bold uppercase tracking-wider mb-1">XP Awarded</p>
                        <p className="font-bold text-slate-900">{scanResult.xpAwarded} XP</p>
                      </div>
                    )}
                    {scanResult.reward && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 w-full">
                        <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">Reward Unlocked</p>
                        <p className="font-bold text-amber-900">{scanResult.reward}</p>
                      </div>
                    )}
                    {redirectPath && (
                      <button
                        onClick={() => navigate(redirectPath)}
                        className="w-full mb-3 bg-sky-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                      >
                        <ExternalLink size={18} />
                        Open Page
                      </button>
                    )}
                    <button 
                      onClick={resetScanner}
                      className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
                    >
                      Scan Another
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Scan Failed</h3>
                    <p className="text-slate-600 mb-4">{scanResult.message}</p>
                    <button 
                      onClick={resetScanner}
                      className="w-full bg-slate-100 text-slate-900 py-3 rounded-xl font-bold"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {cameraError ? (
                   <div className="bg-red-500/80 backdrop-blur-md p-4 rounded-xl text-center pointer-events-auto">
                     <p className="font-bold mb-1">Camera Error</p>
                     <p className="text-sm opacity-90">{cameraError}</p>
                   </div>
                ) : (
                  <>
                    <p className="text-center text-sm mb-12 opacity-90 drop-shadow-md font-medium">
                        Position the QR code within the frame to scan.
                    </p>

                    <div className="w-64 h-64 border-2 border-sky-400/50 rounded-3xl relative flex items-center justify-center overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                        {/* Scanning Line Animation */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                        
                        {/* Corner Markers */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-sky-400 rounded-tl-xl"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-sky-400 rounded-tr-xl"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-sky-400 rounded-bl-xl"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-sky-400 rounded-br-xl"></div>
                    </div>
                  </>
                )}
              </>
            )}
       </div>

       {/* Manual Entry (Dev Mode) */}
       <div className="relative z-10 p-6 pb-12 space-y-4 pointer-events-auto">
            {!scanResult && (
              <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
                <p className="text-xs text-white/60 mb-2 uppercase font-bold tracking-wider">Developer Mode</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter QR data manually..."
                    className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400 text-white"
                  />
                  <button 
                    onClick={() => handleScan(manualCode)}
                    disabled={isProcessing || !manualCode}
                    className="bg-sky-500 px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-white"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simulate'}
                  </button>
                </div>
              </div>
            )}
       </div>

      {/* Debug Panel (admin only) */}
      {showDebug && (
        <div className="absolute bottom-4 left-4 right-4 z-20 bg-slate-900/90 text-white rounded-xl border border-white/10 p-4 max-h-64 overflow-y-auto backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Bug size={16} />
              <span>Scanner Debug</span>
            </div>
            <button onClick={() => setShowDebug(false)} className="p-1 rounded-md hover:bg-white/10" aria-label="Close debug">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-white/5 rounded-lg p-2">Camera ready: {isCameraReady ? 'yes' : 'no'}</div>
            <div className="bg-white/5 rounded-lg p-2">Processing: {isProcessing ? 'yes' : 'no'}</div>
            <div className="bg-white/5 rounded-lg p-2">Scanning lock: {isScanningRef.current ? 'locked' : 'ready'}</div>
            <div className="bg-white/5 rounded-lg p-2">Camera error: {cameraError || 'none'}</div>
          </div>
          <div className="space-y-1 text-[11px] font-mono">
            {debugLogs.length === 0 && <p className="text-white/60">No debug logs yet.</p>}
            {debugLogs.map((log, idx) => (
              <p key={idx} className="text-white/80">{log}</p>
            ))}
          </div>
        </div>
      )}

         <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
         `}</style>
    </div>
  );
};

export default ScanQR;
