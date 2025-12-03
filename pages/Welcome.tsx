import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getMedia } from '../data/mediaLibrary';

const Welcome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative h-screen w-full bg-sky-50 overflow-hidden flex flex-col items-center justify-end pb-12">
      {/* Background Illustration Simulation */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 right-0 h-2/3 bg-gradient-to-b from-teal-200 to-sky-100 opacity-50"></div>
        <img 
          src={getMedia('mariaCristinaFalls')} 
          alt="Maria Cristina Falls" 
          className="w-full h-full object-cover opacity-30 mix-blend-overlay grayscale"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/800/600?nature'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full px-8 flex flex-col items-center text-center">
        <div className="mb-8 bg-orange-100 p-4 rounded-xl shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
           {/* Logo Simulation */}
           <div className="w-16 h-16 flex items-center justify-center border-2 border-slate-800 p-1">
             <div className="w-full h-full border border-slate-800 flex items-center justify-center bg-white">
                <span className="text-xs uppercase tracking-widest font-serif text-slate-800 font-bold">Bisita</span>
             </div>
           </div>
        </div>

        <h1 className="text-4xl font-extrabold text-slate-900 mb-1 tracking-tight">
          Bisita Iligan
        </h1>
        <p className="text-xl text-sky-600 font-serif italic mb-2">"Maayong Pag-abot!"</p>
        <h2 className="text-xs font-bold text-slate-400 mb-6 tracking-[0.2em] uppercase">
          Lanao del Norte, Philippines
        </h2>
        <p className="text-slate-500 mb-12 text-lg leading-relaxed max-w-xs mx-auto">
          Explore the <span className="font-semibold text-slate-700">City of Majestic Waterfalls</span>. Discover the Tourism Triangle, local heritage, and Timoga springs.
        </p>

        <button
          onClick={() => navigate('/login')}
          className="w-full bg-sky-600 text-white font-bold py-4 rounded-xl shadow-xl hover:bg-sky-700 transition-colors transform active:scale-95"
        >
          Explore Iligan
        </button>
      </div>
    </div>
  );
};

export default Welcome;