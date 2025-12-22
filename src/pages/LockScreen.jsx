import React, { useState } from 'react';
import { Lock, ChevronRight } from 'lucide-react';

const LockScreen = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePress = (num) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleSubmit = () => {
    // Default PIN is "1234" (You can change this)
    if (pin === '1234') {
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 backdrop-blur-md">
           <Lock size={32} />
        </div>
        <h1 className="text-xl font-bold">Library Locked</h1>
        <p className="text-gray-400 text-sm">Enter Admin PIN</p>
      </div>

      {/* PIN DOTS */}
      <div className="flex gap-4 mb-10">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full transition-all ${i < pin.length ? 'bg-blue-500 scale-110' : 'bg-gray-700'}`}></div>
        ))}
      </div>
      {error && <p className="text-red-400 text-xs mb-4 font-bold animate-pulse">Wrong PIN. Try 1234.</p>}

      {/* NUMPAD */}
      <div className="grid grid-cols-3 gap-4 w-64">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button key={num} onClick={() => handlePress(num)} className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/20 font-bold text-xl transition-all active:scale-95">
            {num}
          </button>
        ))}
        <button onClick={() => setPin('')} className="w-16 h-16 rounded-full text-xs font-bold text-red-400">CLR</button>
        <button onClick={() => handlePress(0)} className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/20 font-bold text-xl transition-all">0</button>
        <button onClick={handleSubmit} className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-500 flex items-center justify-center transition-all"><ChevronRight/></button>
      </div>
    </div>
  );
};

export default LockScreen;