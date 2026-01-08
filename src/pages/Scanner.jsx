import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useNavigate } from 'react-router-dom';
import { Search, LogIn, LogOut, QrCode, List, ArrowLeft, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

// --- INTERNAL TOAST COMPONENT (For Professional Alerts) ---
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'success' ? 'bg-emerald-600' : 'bg-red-500';
  const icon = type === 'success' ? <CheckCircle size={20} className="text-white"/> : <AlertTriangle size={20} className="text-white"/>;

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl ${bg} text-white animate-fade-in-down`}>
      {icon}
      <span className="font-bold text-sm">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-80 hover:opacity-100"><X size={16}/></button>
    </div>
  );
};

// --- MAIN SCANNER COMPONENT ---
const Scanner = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('scan'); 
  const [scanResult, setScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null); // { msg, type }

  // Optimized Audio Ref
  const audioRef = useRef(new Audio('https://actions.google.com/sounds/v1/science_fiction/scifi_laser_1.ogg'));

  const students = useLiveQuery(() => db.students.where('status').equals('Active').toArray());
  
  // Live log for UI feedback
  const activeLogs = useLiveQuery(async () => {
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
    const logs = await db.attendance.where('date').above(startOfDay).toArray();
    const statusMap = {};
    logs.forEach(l => statusMap[l.studentId] = l.status);
    return statusMap;
  }, []);

  const playSound = () => {
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(e => console.log("Audio blocked", e));
    if (navigator.vibrate) navigator.vibrate(200); // Haptic feedback
  };

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const processAttendance = async (scannedData) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // --- ROBUST QR PARSING ---
      let studentId = scannedData;
      
      // Attempt JSON Parse
      if (typeof scannedData === 'string' && scannedData.trim().startsWith('{')) {
          try {
              const data = JSON.parse(scannedData);
              if (data.uid) studentId = data.uid;
          } catch(e) {
              console.warn("QR is not JSON, treating as raw ID.");
          }
      }

      const id = parseInt(studentId);
      if (isNaN(id)) throw new Error("Invalid QR Format");
      
      const student = await db.students.get(id);

      if (!student) {
        showToast("Student not found in database!", "error");
        setIsProcessing(false);
        return;
      }

      // 1. DETERMINE STATUS
      const lastLog = await db.attendance.where('studentId').equals(id).last();
      const currentStatus = lastLog?.status || 'Out';
      const newStatus = currentStatus === 'In' ? 'Out' : 'In';

      // 2. SMART SEAT ALLOCATION (General Students)
      if (newStatus === 'In' && student.seatType === 'General') {
        const todaysLogs = await db.attendance.where('date').above(new Date().setHours(0,0,0,0)).toArray();
        const statusMap = {};
        todaysLogs.forEach(l => statusMap[l.studentId] = l.status);
        
        // Who is inside right now?
        const currentlyInsideIds = Object.keys(statusMap)
            .filter(sid => statusMap[sid] === 'In')
            .map(sid => parseInt(sid));
        
        if(!currentlyInsideIds.includes(id)) currentlyInsideIds.push(id);

        const studentsInside = await db.students.where('id').anyOf(currentlyInsideIds).toArray();
        
        let targetRoomId = student.roomId; // Preferred room
        let assignedSeat = null;

        const findFreeSeat = async (roomId) => {
           const room = await db.rooms.get(roomId);
           if (!room) return null;
           const takenSeats = studentsInside
              .filter(s => s.roomId === roomId && s.seat_no && s.id !== id) 
              .map(s => s.seat_no);

           for (let i = 1; i <= room.capacity; i++) {
              if (!takenSeats.includes(i)) return i;
           }
           return null;
        };

        // Check Preferred -> Then Check All
        if (targetRoomId) assignedSeat = await findFreeSeat(targetRoomId);
        
        if (!assignedSeat) {
           const allRooms = await db.rooms.toArray();
           for (const r of allRooms) {
             const seat = await findFreeSeat(r.id);
             if (seat) {
               assignedSeat = seat;
               targetRoomId = r.id;
               break;
             }
           }
        }

        if (assignedSeat) {
          await db.students.update(id, { seat_no: assignedSeat, roomId: targetRoomId });
        } else {
          showToast("⚠️ Library Full! Entry recorded without seat.", "error");
        }
      }

      // 3. RELEASE SEAT
      if (newStatus === 'Out' && student.seatType === 'General') {
        await db.students.update(id, { seat_no: null });
      }

      // 4. LOG IT
      await db.attendance.add({
        studentId: id,
        date: new Date(),
        status: newStatus,
        inTime: newStatus === 'In' ? new Date() : null,
        outTime: newStatus === 'Out' ? new Date() : null
      });

      playSound();
      setScanResult({ name: student.name, status: newStatus });
      
    } catch (err) {
      console.error(err);
      showToast(err.message || "Scanning Failed", "error");
    }

    // Reset after delay
    setTimeout(() => {
        setIsProcessing(false);
        setScanResult(null);
    }, 2500);
  };
  
  useEffect(() => {
    if (mode === 'scan' && !isProcessing && !scanResult) {
      const scanner = new Html5QrcodeScanner(
          "reader", 
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, 
          false
      );
      
      scanner.render((decodedText) => {
        if (!isProcessing) { 
            scanner.clear();
            processAttendance(decodedText); 
        }
      }, (err) => {});

      return () => scanner.clear().catch(() => {});
    }
  }, [mode, isProcessing, scanResult]);

  const isInside = (id) => activeLogs && activeLogs[id] === 'In';
  const filtered = students?.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
       
       {/* TOAST CONTAINER */}
       {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

       {/* HEADER */}
       <div className="bg-white px-4 py-3 sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
           <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft size={18}/></button>
              <div>
                <h1 className="text-lg font-bold text-gray-800 leading-tight">Scanner</h1>
                <p className="text-[10px] font-medium text-gray-400">Mark Attendance</p>
              </div>
           </div>
           <button onClick={() => navigate('/attendance')} className="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-xs font-bold border border-blue-100 active:scale-95 transition-transform">
             History Log
           </button>
        </div>
        
        {/* MODE TOGGLE */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl relative">
           <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-sm transition-all duration-300 ease-out ${mode === 'list' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'}`}></div>
           <button onClick={() => setMode('scan')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold relative z-10 transition-colors ${mode === 'scan' ? 'text-gray-900' : 'text-gray-400'}`}>
             <div className="flex items-center justify-center gap-2"><QrCode size={16}/> Scan QR</div>
           </button>
           <button onClick={() => setMode('list')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold relative z-10 transition-colors ${mode === 'list' ? 'text-gray-900' : 'text-gray-400'}`}>
             <div className="flex items-center justify-center gap-2"><List size={16}/> Manual List</div>
           </button>
        </div>
      </div>

      {/* === SCANNER VIEW === */}
      {mode === 'scan' && (
        <div className="flex flex-col items-center justify-center h-[65vh] p-4 relative">
            {/* Scanner Frame */}
            <div className="bg-white p-2 rounded-3xl shadow-2xl border border-gray-100 w-full max-w-xs relative overflow-hidden">
                {!scanResult && !isProcessing && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent z-20 animate-[scan_2s_ease-in-out_infinite]" style={{top: '50%'}}></div>
                )}
                <div id="reader" className="overflow-hidden rounded-2xl bg-black min-h-[250px]"></div>
                <div className="absolute inset-0 border-[3px] border-white/50 rounded-3xl pointer-events-none"></div>
            </div>
            
            <p className="mt-6 text-gray-400 text-xs font-medium uppercase tracking-widest">Align QR Code within frame</p>

            {/* Result Popup (Glassmorphism) */}
            {scanResult && (
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 bg-white/90 backdrop-blur-xl border border-white/50 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 animate-fade-in scale-105`}>
                    <div className={`p-4 rounded-full ${scanResult.status === 'In' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} shadow-inner`}>
                       {scanResult.status === 'In' ? <LogIn size={32}/> : <LogOut size={32}/>}
                    </div>
                    <div className="text-center">
                       <h2 className="text-xl font-bold text-gray-800">{scanResult.name}</h2>
                       <p className={`text-sm font-bold uppercase tracking-wider mt-1 ${scanResult.status === 'In' ? 'text-green-600' : 'text-red-500'}`}>
                         Marked {scanResult.status === 'In' ? 'Present' : 'Absent'}
                       </p>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* === MANUAL LIST VIEW === */}
      {mode === 'list' && (
        <div className="p-4 space-y-4">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  placeholder="Search student by name..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  className="w-full pl-11 p-4 bg-white rounded-2xl border border-gray-100 outline-none focus:ring-2 ring-blue-500/20 focus:border-blue-500 transition-all font-medium shadow-sm" 
                />
            </div>
            
            <div className="space-y-3 pb-10">
                {filtered?.map(s => {
                    const inside = isInside(s.id);
                    return (
                        <button 
                          key={s.id} 
                          onClick={() => processAttendance(s.id)} 
                          className="w-full bg-white p-3 pr-4 rounded-2xl border border-gray-100 flex justify-between items-center active:scale-[0.98] active:bg-gray-50 transition-all shadow-sm hover:shadow-md"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm ${inside ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-gray-300 to-gray-400'}`}>
                                    {s.name.charAt(0)}
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-gray-800 text-sm">{s.name}</p>
                                    <div className={`flex items-center gap-1 mt-0.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md w-fit ${inside ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                       {inside ? '● Inside' : '○ Outside'}
                                    </div>
                                </div>
                            </div>
                            <div className={`p-2 rounded-full transition-colors ${inside ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-green-500 bg-green-50 hover:bg-green-100'}`}>
                                {inside ? <LogOut size={20}/> : <LogIn size={20}/>}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
      )}

      {/* CSS for Scanner Line Animation */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.3s ease-out forwards;
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
};

export default Scanner;