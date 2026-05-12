import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useNavigate } from 'react-router-dom';
import { Search, LogIn, LogOut, QrCode, List, ArrowLeft, X, CheckCircle, AlertTriangle, User, Zap, Activity, ShieldCheck, Target } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const Scanner = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('scan');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [search, setSearch] = useState('');

  const students = useLiveQuery(() => db.students.toArray());
  const attendance = useLiveQuery(() => db.attendance.toArray());

  const activeLogs = attendance?.reduce((acc, log) => {
    const logDate = new Date(log.date).toDateString();
    if (logDate === new Date().toDateString()) acc[log.studentId] = log.status;
    return acc;
  }, {});

  const processAttendance = async (decodedText) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const data = JSON.parse(decodedText);
      const id = data.uid || data.id;
      if (!id) throw new Error("INVALID_ENCRYPTION_KEY");

      const student = await db.students.get(parseInt(id));
      if (!student) throw new Error("IDENTITY_NOT_FOUND");

      const lastStatus = activeLogs?.[id] || 'Out';
      const newStatus = lastStatus === 'In' ? 'Out' : 'In';

      await db.attendance.add({
        studentId: parseInt(id),
        date: new Date(),
        status: newStatus,
        inTime: newStatus === 'In' ? new Date() : null,
        outTime: newStatus === 'Out' ? new Date() : null
      });

      setScanResult({ name: student.name, status: newStatus, id: student.id });
    } catch (err) {
      setScanError(err.message);
    }

    setTimeout(() => {
      setIsProcessing(false);
      setScanResult(null);
      setScanError(null);
    }, 3000);
  };

  useEffect(() => {
    if (mode === 'scan' && !isProcessing && !scanResult) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 280 }, false);
      scanner.render(processAttendance, () => {});
      return () => scanner.clear().catch(() => {});
    }
  }, [mode, isProcessing, scanResult]);

  const filtered = students?.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-12 space-y-12 animate-reveal relative">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-50 blur-[150px] -z-10 rounded-full"></div>
      
      {/* Header HUD */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-slate-200 pb-12">
        <div className="flex items-center gap-6">
           <button onClick={() => navigate(-1)} className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-blue-600 transition-all shadow-sm active:scale-90 group">
              <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
           </button>
           <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse"></div>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Live Attendance</span>
              </div>
              <h1 className="text-5xl font-display font-extrabold text-slate-900 tracking-tight leading-none mb-1">Scanner</h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Scan ID Card to mark attendance</p>
           </div>
        </div>
        
        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-sm backdrop-blur-xl">
           {['scan', 'list'].map(m => (
             <button key={m} onClick={() => setMode(m)} className={`px-8 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-500 ${mode === m ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>
                {m === 'scan' ? 'Scan Card' : 'Manual Entry'}
             </button>
           ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto relative">
         
         {mode === 'scan' && (
           <div className="space-y-12">
              <div className="luxury-card p-6 rounded-[4rem] bg-white border-slate-200 shadow-sm relative group overflow-hidden">
                 
                 <div id="reader" className="rounded-[3rem] overflow-hidden"></div>
                 
                 {!scanResult && !scanError && !isProcessing && (
                   <div className="absolute inset-x-8 top-0 h-1.5 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-[scan_3s_infinite] z-20 opacity-60"></div>
                 )}
                 
                 {scanError && (
                   <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center animate-reveal z-50 text-center p-12">
                      <div className="w-32 h-32 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-sm relative bg-rose-50 border border-rose-200 text-rose-600">
                         <div className="absolute inset-0 rounded-[2.5rem] animate-ping opacity-20 bg-inherit"></div>
                         <AlertTriangle size={48} strokeWidth={2.5}/>
                      </div>
                      
                      <p className="text-[10px] font-bold text-rose-600 uppercase tracking-[0.5em] mb-4">Error</p>
                      <h2 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight mb-2">{scanError}</h2>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-10">Invalid ID</p>
                   </div>
                 )}
                 
                 {scanResult && (
                   <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center animate-reveal z-50 text-center p-12">
                      <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-sm relative border ${scanResult.status === 'In' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                         <div className="absolute inset-0 rounded-[2.5rem] animate-ping opacity-20 bg-inherit"></div>
                         {scanResult.status === 'In' ? <LogIn size={48} strokeWidth={2.5}/> : <LogOut size={48} strokeWidth={2.5}/>}
                      </div>
                      
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.5em] mb-4">Verification Success</p>
                      <h2 className="text-4xl font-display font-extrabold text-slate-900 tracking-tight mb-2">{scanResult.name}</h2>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-10">Student #{scanResult.id}</p>
                      
                      <div className={`inline-flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] border transition-all ${scanResult.status === 'In' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                         <Activity size={16} className="animate-pulse"/> Status: {scanResult.status === 'In' ? 'Marked Present' : 'Marked Left'}
                      </div>
                   </div>
                 )}
              </div>

              <div className="flex justify-center px-8">
                 <div className="flex flex-col items-center gap-3">
                    <div className="px-6 py-2 bg-white border border-slate-200 rounded-full flex items-center gap-3 shadow-sm">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">System Ready</span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Awaiting ID Card</p>
                 </div>
              </div>
           </div>
         )}

         {mode === 'list' && (
           <div className="space-y-8 animate-reveal">
              <div className="relative group">
                 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={24}/>
                 <input 
                    placeholder="Search Students..." 
                    value={search} onChange={e=>setSearch(e.target.value)}
                    className="luxury-card shadow-sm w-full pl-16 pr-8 py-6 bg-white border-slate-200 focus:border-blue-300 text-slate-900 font-bold text-2xl placeholder:text-slate-400 outline-none transition-colors" 
                 />
              </div>

              <div className="grid grid-cols-1 gap-4">
                 {filtered?.slice(0, 8).map(s => {
                    const inside = activeLogs?.[s.id] === 'In';
                    return (
                       <div key={s.id} onClick={() => processAttendance(JSON.stringify({uid: s.id}))} className="luxury-card p-6 rounded-3xl flex items-center justify-between cursor-pointer bg-white border-slate-200 hover:bg-slate-50 hover:border-blue-300 shadow-sm transition-all active:scale-95 group">
                          <div className="flex items-center gap-6">
                             <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden p-0.5 shadow-sm group-hover:rotate-3 transition-transform">
                                {s.photo ? <img src={s.photo} className="w-full h-full object-cover rounded-xl" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><User size={24}/></div>}
                             </div>
                             <div>
                                <p className="text-xl font-display font-extrabold text-slate-900 tracking-tight mb-1 group-hover:text-blue-600 transition-colors">{s.name}</p>
                                <div className="flex items-center gap-3">
                                   <div className={`w-1.5 h-1.5 rounded-full ${inside ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{inside ? 'Present' : 'Left'}</span>
                                </div>
                             </div>
                          </div>
                          <div className={`p-4 rounded-2xl border transition-all ${inside ? 'bg-slate-50 border-slate-200 text-slate-500 group-hover:bg-slate-100 group-hover:text-slate-900' : 'bg-blue-50 border-blue-200 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'}`}>
                             {inside ? <LogOut size={24} strokeWidth={2.5}/> : <LogIn size={24} strokeWidth={2.5}/>}
                          </div>
                       </div>
                    );
                 })}
              </div>
           </div>
         )}
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(450px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Scanner;