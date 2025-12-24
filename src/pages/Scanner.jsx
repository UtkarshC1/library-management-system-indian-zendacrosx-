import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useNavigate } from 'react-router-dom';
import { Search, LogIn, LogOut, QrCode, List, ArrowLeft } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const Scanner = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('scan'); 
  const [scanResult, setScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState('');
  
  const beepSound = new Audio('https://actions.google.com/sounds/v1/science_fiction/scifi_laser_1.ogg');

  const students = useLiveQuery(() => db.students.where('status').equals('Active').toArray());
  
  // Live log for UI feedback
  const activeLogs = useLiveQuery(async () => {
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
    const logs = await db.attendance.where('date').above(startOfDay).toArray();
    const statusMap = {};
    logs.forEach(l => statusMap[l.studentId] = l.status);
    return statusMap;
  }, []);

  const processAttendance = async (studentId) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const id = parseInt(studentId);
      const student = await db.students.get(id);

      if (!student) {
        alert("Student not found!");
        setIsProcessing(false);
        return;
      }

      // 1. GET CURRENT STATUS
      const lastLog = await db.attendance.where('studentId').equals(id).last();
      const currentStatus = lastLog?.status || 'Out';
      const newStatus = currentStatus === 'In' ? 'Out' : 'In';

      // 2. DYNAMIC SEAT ALLOCATION (General Students)
      if (newStatus === 'In' && student.seatType === 'General') {
        
        // --- FIX: CORRECTLY IDENTIFY OCCUPIED SEATS ---
        // Get all logs for today
        const todaysLogs = await db.attendance.where('date').above(new Date().setHours(0,0,0,0)).toArray();
        
        // Determine who is CURRENTLY inside
        const statusMap = {};
        todaysLogs.forEach(l => statusMap[l.studentId] = l.status);
        const currentlyInsideIds = Object.keys(statusMap)
            .filter(sid => statusMap[sid] === 'In')
            .map(sid => parseInt(sid));
        
        // Add current user to this list (since they are about to enter)
        if(!currentlyInsideIds.includes(id)) currentlyInsideIds.push(id);

        // Fetch details of everyone inside to see which seats are taken
        const studentsInside = await db.students.where('id').anyOf(currentlyInsideIds).toArray();
        
        let targetRoomId = student.roomId;
        let assignedSeat = null;

        const findFreeSeat = async (roomId) => {
           const room = await db.rooms.get(roomId);
           if (!room) return null;

           // Filter seats taken by people currently inside ONLY
           const takenSeats = studentsInside
              .filter(s => s.roomId === roomId && s.seat_no && s.id !== id) 
              .map(s => s.seat_no);

           for (let i = 1; i <= room.capacity; i++) {
              if (!takenSeats.includes(i)) return i;
           }
           return null;
        };

        // Try Preferred Room first
        if (targetRoomId) {
           assignedSeat = await findFreeSeat(targetRoomId);
        }

        // If full/undefined, search ALL rooms
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
          alert("Library Full! No seats available.");
        }
      }

      // 3. RELEASE SEAT (General Students on Exit)
      if (newStatus === 'Out' && student.seatType === 'General') {
        await db.students.update(id, { seat_no: null });
      }

      // 4. LOG ENTRY
      await db.attendance.add({
        studentId: id,
        date: new Date(),
        status: newStatus,
        inTime: newStatus === 'In' ? new Date() : null,
        outTime: newStatus === 'Out' ? new Date() : null
      });

      beepSound.play().catch(()=>{});
      setScanResult({ name: student.name, status: newStatus });
      
    } catch (err) {
      console.error(err);
      alert("Error: " + err.message);
    }

    setTimeout(() => {
        setIsProcessing(false);
        setScanResult(null);
    }, 2000);
  };

  // ... (Rest of UI code remains mostly same, just standard hooks)
  
  useEffect(() => {
    if (mode === 'scan' && !isProcessing && !scanResult) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 }, false);
      scanner.render((decodedText) => {
        if (!isProcessing) { scanner.clear(); processAttendance(decodedText); }
      }, (err) => {});
      return () => scanner.clear().catch(err => console.error(err));
    }
  }, [mode, isProcessing, scanResult]);

  const isInside = (id) => activeLogs && activeLogs[id] === 'In';
  const filtered = students?.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
       {/* HEADER & UI (Standard as before) */}
       <div className="bg-white p-4 sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-4">
           <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 rounded-full"><ArrowLeft size={20}/></button>
              <h1 className="text-xl font-bold text-gray-800">Attendance</h1>
           </div>
           <button onClick={() => navigate('/attendance')} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-100">View Logs</button>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
           <button onClick={() => setMode('scan')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${mode === 'scan' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>Scan</button>
           <button onClick={() => setMode('list')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${mode === 'list' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>Manual</button>
        </div>
      </div>

      {mode === 'scan' && (
        <div className="p-4 flex flex-col items-center justify-center h-[50vh]">
            <div id="reader" className="w-full max-w-sm overflow-hidden rounded-xl border-4 border-white shadow-lg"></div>
            {scanResult && (
                <div className={`mt-4 px-6 py-3 rounded-xl text-white font-bold text-lg animate-bounce ${scanResult.status === 'In' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {scanResult.status.toUpperCase()}: {scanResult.name}
                </div>
            )}
        </div>
      )}

      {mode === 'list' && (
        <div className="p-4 space-y-3">
            <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-3 bg-white rounded-xl border border-gray-200" />
            {filtered?.map(s => {
                const inside = isInside(s.id);
                return (
                    <button key={s.id} onClick={() => processAttendance(s.id)} className="w-full bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                        <div className="text-left">
                            <p className="font-bold text-gray-800">{s.name}</p>
                            <p className={`text-[10px] font-bold ${inside ? 'text-green-600' : 'text-gray-400'}`}>{inside ? 'INSIDE' : 'AWAY'}</p>
                        </div>
                        <div className={`p-2 rounded-full ${inside ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                            {inside ? <LogOut size={16}/> : <LogIn size={16}/>}
                        </div>
                    </button>
                )
            })}
        </div>
      )}
    </div>
  );
};
export default Scanner;