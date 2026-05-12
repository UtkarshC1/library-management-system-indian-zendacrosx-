import React, { useState } from 'react';
import { Lock, Fingerprint, BookOpen, ShieldCheck, Zap } from 'lucide-react';

const LockScreen = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      if (newPin.length === 4) {
        if (newPin === '1234') onUnlock();
        else {
          setError(true);
          setTimeout(() => setPin(''), 600);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 animate-reveal relative overflow-hidden">
      
      {/* HUD Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[150px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100 rounded-full blur-[150px]"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05] pointer-events-none"></div>

      <div className="mb-16 flex flex-col items-center text-center relative z-10">
         <div className="w-24 h-24 bg-white border border-slate-200 rounded-3xl flex items-center justify-center text-blue-600 mb-10 shadow-sm animate-float">
            <ShieldCheck size={48} strokeWidth={2.5} />
         </div>
         <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.6em]">Library System Locked</p>
            </div>
            <h1 className="text-5xl font-display font-extrabold text-slate-900 tracking-tight leading-none">Authentication Required</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 max-w-xs mx-auto leading-relaxed">Enter your PIN to access the library management system.</p>
         </div>
      </div>

      {/* PIN Indicators */}
      <div className="flex gap-8 mb-16 relative z-10">
         {[0, 1, 2, 3].map(i => (
           <div 
             key={i} 
             className={`w-4 h-4 rounded-full transition-all duration-500 ${
               i < pin.length 
               ? 'bg-blue-600 scale-150 shadow-sm' 
               : 'bg-slate-200 border border-slate-300'
             }`}
           ></div>
         ))}
      </div>

      {/* Luxury Numpad */}
      <div className="grid grid-cols-3 gap-8 w-full max-w-[320px] relative z-10">
         {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
           <button 
             key={num} 
             onClick={() => handlePress(num)} 
             className="h-24 rounded-[2rem] bg-white border border-slate-200 font-display font-extrabold text-3xl text-slate-900 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 shadow-sm active:scale-90 transition-all duration-300"
           >
             {num}
           </button>
         ))}
         <button onClick={() => setPin('')} className="h-24 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-rose-600 transition-colors">Clear</button>
         <button onClick={() => handlePress(0)} className="h-24 rounded-[2rem] bg-white border border-slate-200 font-display font-extrabold text-3xl text-slate-900 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 shadow-sm active:scale-90 transition-all duration-300">0</button>
         <div className="h-24 flex items-center justify-center text-slate-300">
            <Zap size={32} className="animate-pulse" />
         </div>
      </div>

      {error && (
        <div className="mt-12 px-6 py-2 bg-rose-50 border border-rose-200 rounded-full animate-shake relative z-10 shadow-sm">
           <p className="text-rose-600 text-[10px] font-bold uppercase tracking-[0.3em]">Incorrect PIN</p>
        </div>
      )}

      <div className="mt-24 flex flex-col items-center gap-4 relative z-10 opacity-60">
         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.8em]">LibPro OS v2.8.4 - Premium Edition</p>
         <div className="flex gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
         </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 3;
        }
      `}</style>
    </div>
  );
};

export default LockScreen;