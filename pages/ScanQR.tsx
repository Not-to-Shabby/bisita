
import React, { useState } from 'react';
import { ArrowLeft, Flashlight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ScanQR: React.FC = () => {
  const navigate = useNavigate();
  const [isFlashOn, setIsFlashOn] = useState(false);

  return (
    <div className="relative h-screen bg-black text-white flex flex-col">
       {/* Camera Feed Simulation */}
       <div className="absolute inset-0 z-0">
         <img 
            src="https://picsum.photos/800/1200?grayscale&blur=2" 
            alt="Camera Feed" 
            className="w-full h-full object-cover opacity-60"
         />
       </div>

       {/* Header */}
       <div className="relative z-10 p-6 pt-12 flex items-center justify-between">
         <button onClick={() => navigate(-1)}>
            <ArrowLeft size={24} />
         </button>
         <span className="font-bold text-lg">Scan QR Code</span>
         <div className="w-6"></div>
       </div>

       {/* Scanner UI */}
       <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-8">
            <p className="text-center text-sm mb-12 opacity-90">
                Position the QR code within the frame to scan.
            </p>

            <div className="w-64 h-64 border-2 border-sky-400 rounded-3xl relative flex items-center justify-center overflow-hidden bg-white/5 backdrop-blur-sm">
                 {/* Scanning Line Animation */}
                 <div className="absolute top-0 left-0 right-0 h-1 bg-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
                 <div className="w-48 h-48 bg-black rounded-xl flex items-center justify-center">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=BisitaIligan" alt="QR" className="opacity-80 invert" />
                 </div>
            </div>

            <button 
                onClick={() => setIsFlashOn(!isFlashOn)}
                className="mt-16 flex flex-col items-center gap-2"
            >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${isFlashOn ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white'}`}>
                    <Flashlight size={20} />
                </div>
                <span className="text-xs">Flashlight</span>
            </button>
       </div>

       <div className="relative z-10 p-6 pb-12">
            <button 
                onClick={() => navigate(-1)}
                className="w-full bg-sky-500 py-4 rounded-xl font-bold shadow-lg"
            >
                Cancel
            </button>
       </div>

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
