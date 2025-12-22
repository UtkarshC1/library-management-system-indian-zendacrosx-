import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useNavigate } from 'react-router-dom';
import { Search, LogIn, LogOut, QrCode, List, ArrowLeft, User, Clock } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const Scanner = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('scan'); // 'scan' or 'list'
  const [scanResult, setScanResult] = useState(null);
  const [isPaused, setIsPaused] = useState(false); // New: Prevent double scans
  const [search, setSearch] = useState('');
  
  // Audio
  const beepSound = new Audio('https://actions.google.com/sounds/v1/science_fiction/scifi_laser_1.ogg');

  // --- DATA ---
  const students = useLiveQuery(() => db.students.where('status').equals('Active').toArray());
  const todayLogs = useLiveQuery(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    return db.attendance.where('date').above(startOfDay).toArray();
  });

  // --- LOGIC ---
  const isInside = (studentId) => {
    const logs = todayLogs?.filter(l => l.studentId === studentId);
    if (!logs || logs.length === 0) return false;
    const latest = logs.sort((a,b) => b.date - a.date)[0];
    return latest.status === 'In';
  };

  const processAttendance = async (studentId) => {
    const id = parseInt(studentId);
    const student = await db.students.get(id);

    if (!student) return alert("Student not found!");

    const currentlyInside = isInside(id);
    const newStatus = currentlyInside ? 'Out' : 'In';

    await db.attendance.add({
      studentId: id,
      date: new Date(),
      status: newStatus,
      inTime: newStatus === 'In' ? new Date() : null,
      outTime: newStatus === 'Out' ? new Date() : null
    });

    beepSound.play().catch(() => {});
    setScanResult({ name: student.name, status: newStatus });
    setIsPaused(true); // Freeze scanner
    
    // Resume after 2.5s
    setTimeout(() => {
        setScanResult(null);
        setIsPaused(false);
    }, 2500);
  };

  // --- SCANNER EFFECT ---
  useEffect(() => {
    if (mode === 'scan' && !isPaused) {
      const scanner = new Html5QrcodeScanner(
        "reader", 
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        false
      );
      
      scanner.render((decodedText) => {
        if (!isPaused) {
            scanner.clear(); // Important: clear to stop camera
            processAttendance(decodedText);
        }
      }, (err) => {
          // ignore scan errors
      });

      return () => scanner.clear().catch(err => console.error(err));
    }
  }, [mode, isPaused]);

  // Filter
  const filtered = students?.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const insideCount = students?.filter(s => isInside(s.id)).length || 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      
      {/* 1. HEADER */}
      <div className="bg-white p-4 sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
           <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  <ArrowLeft size={20}/>
              </button>
              <h1 className="text-xl font-bold text-gray-800">Attendance</h1>
           </div>
           <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm font-bold text-green-700">{insideCount} Inside</span>
           </div>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl">
           <button onClick={() => setMode('scan')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'scan' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>
             <QrCode size={18}/> Scan
           </button>
           <button onClick={() => setMode('list')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>
             <List size={18}/> Manual
           </button>
        </div>
      </div>

      {/* 2. SCANNER VIEW */}
      {mode === 'scan' && (
        <div className="p-4 flex flex-col items-center justify-center h-[60vh]">
            <div className="w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl relative border-4 border-white ring-4 ring-gray-100">
                {!scanResult ? (
                    <div id="reader" className="w-full h-full object-cover"></div>
                ) : (
                    <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 text-white ${scanResult.status === 'In' ? 'bg-green-500' : 'bg-red-500'}`}>
                        <div className="bg-white/20 p-4 rounded-full mb-4 backdrop-blur-md">
                            {scanResult.status === 'In' ? <LogIn size={48} /> : <LogOut size={48} />}
                        </div>
                        <h2 className="text-3xl font-bold mb-1">{scanResult.status.toUpperCase()}</h2>
                        <p className="text-lg opacity-90">{scanResult.name}</p>
                    </div>
                )}
            </div>
            {!scanResult && <p className="mt-6 text-gray-400 text-sm font-medium animate-pulse">Point camera at QR Code</p>}
        </div>
      )}

      {/* 3. LIST VIEW */}
      {mode === 'list' && (
        <div className="p-4 space-y-3">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100 focus:border-blue-500 outline-none font-medium" />
            </div>
            {filtered?.map(student => {
                const inside = isInside(student.id);
                return (
                    <div key={student.id} onClick={() => processAttendance(student.id)} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${inside ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {student.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 text-sm">{student.name}</h3>
                                <p className={`text-[10px] font-bold ${inside ? 'text-green-600' : 'text-gray-400'}`}>{inside ? 'CURRENTLY INSIDE' : 'AWAY'}</p>
                            </div>
                        </div>
                        <div className={`p-2 rounded-full ${inside ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                            {inside ? <LogOut size={18}/> : <LogIn size={18}/>}
                        </div>
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
};

export default Scanner;