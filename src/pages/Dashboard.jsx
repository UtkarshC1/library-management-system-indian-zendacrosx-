import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ChevronDown, Armchair, UserCheck, Sun, Moon, Clock } from 'lucide-react';

const Dashboard = () => {
  // 1. Fetch Data
  const rooms = useLiveQuery(() => db.rooms.toArray());
  const students = useLiveQuery(() => db.students.where('status').equals('Active').toArray());
  
  // 2. Fetch Live Attendance (Who is INSIDE right now?)
  const activeAttendance = useLiveQuery(async () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const logs = await db.attendance.where('date').above(today).toArray();
    
    // Logic: Find the latest log for each student to determine current status
    const insideSet = new Set();
    const studentStatus = {}; 
    logs.forEach(l => { studentStatus[l.studentId] = l.status; });
    
    Object.keys(studentStatus).forEach(id => {
        if(studentStatus[id] === 'In') insideSet.add(parseInt(id));
    });
    return insideSet;
  });

  const [selectedRoomId, setSelectedRoomId] = useState(null);

  // Auto-select first room
  useEffect(() => {
    if (rooms && rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms]);

  // --- LOADING STATE ---
  if (!rooms || !students) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-400 font-bold text-sm">Loading Library...</p>
      </div>
    );
  }

  // --- EMPTY STATE ---
  if (rooms.length === 0) {
     return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-10 text-center">
            <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                <Armchair size={48} className="text-gray-300"/>
            </div>
            <h2 className="text-xl font-bold text-gray-800">No Rooms Configured</h2>
            <p className="text-gray-400 mb-6">Go to Settings to create your first seating zone.</p>
            <a href="/settings" className="bg-black text-white px-6 py-3 rounded-xl font-bold">Configure Rooms</a>
        </div>
     );
  }

  // --- PREPARE DATA FOR GRID ---
  const currentRoom = rooms.find(r => r.id === parseInt(selectedRoomId));
  const roomStudents = students.filter(s => s.roomId === parseInt(selectedRoomId));

  const seatMap = {};
  roomStudents.forEach(s => {
    if (s.seat_no) seatMap[s.seat_no] = s;
  });

  const totalSeats = currentRoom ? currentRoom.capacity : 0;
  const seats = Array.from({ length: totalSeats }, (_, i) => i + 1);
  const gridCols = currentRoom?.cols || 5;

  // Stats
  const occupiedCount = roomStudents.length;
  const actuallyInsideCount = roomStudents.filter(s => activeAttendance?.has(s.id)).length || 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 animate-fade-in">
      
      {/* HEADER CONTROLS */}
      <div className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-100 px-4 py-3 flex justify-between items-center">
        
        {/* Room Selector */}
        <div className="relative group">
          <select 
            value={selectedRoomId || ''}
            onChange={(e) => setSelectedRoomId(parseInt(e.target.value))}
            className="appearance-none bg-transparent font-bold text-xl text-gray-800 pr-8 focus:outline-none cursor-pointer z-10 relative"
          >
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-blue-600 transition-colors" size={20} />
        </div>

        {/* Live Counters */}
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
           <div className="text-center">
              <span className="block text-lg text-green-600">{actuallyInsideCount}</span> 
              <span className="text-gray-400">Inside</span>
           </div>
           <div className="w-px h-8 bg-gray-100"></div>
           <div className="text-center">
              <span className="block text-lg text-red-500">{occupiedCount - actuallyInsideCount}</span> 
              <span className="text-gray-400">Away</span>
           </div>
        </div>
      </div>

      {/* SEAT GRID */}
      <div className="p-4 overflow-x-auto">
        <div 
            className="grid gap-3 mx-auto transition-all"
            style={{ 
                gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            }}
        >
          {seats.map((seatNum) => {
            const student = seatMap[seatNum];
            const isAssigned = !!student;
            const isInside = isAssigned && activeAttendance?.has(student.id);

            // Shift Logic
            const isMorning = student?.shift === 'Morning' || student?.shift === 'Full Day';
            const isEvening = student?.shift === 'Evening' || student?.shift === 'Full Day';

            return (
              <div 
                key={seatNum}
                onClick={() => isAssigned && alert(`Name: ${student.name}\nShift: ${student.shift || 'Full Day'}\nStatus: ${isInside ? 'INSIDE' : 'AWAY'}`)}
                className={`
                  aspect-square rounded-xl flex flex-col items-center justify-center border transition-all relative overflow-hidden shadow-sm cursor-pointer active:scale-95 group
                  ${!isAssigned ? 'bg-white border-gray-200 hover:border-blue-300' : ''}
                  ${isAssigned && !isInside ? 'bg-red-50 border-red-200' : ''}
                  ${isInside ? 'bg-green-100 border-green-300 ring-2 ring-green-100' : ''}
                `}
              >
                {/* Seat Number */}
                <span className={`text-sm font-bold ${!isAssigned ? 'text-gray-300' : (isInside ? 'text-green-700' : 'text-red-400')}`}>
                  {seatNum}
                </span>

                {/* --- PRO FEATURE: SHIFT INDICATORS --- */}
                {isAssigned && (
                   <div className="absolute top-1.5 left-1.5 flex gap-0.5">
                      {isMorning && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-sm" title="Morning Shift"></div>}
                      {isEvening && <div className="w-1.5 h-1.5 rounded-full bg-blue-800 shadow-sm" title="Evening Shift"></div>}
                   </div>
                )}

                {/* Name Label */}
                {isAssigned && (
                  <div className={`absolute bottom-0 w-full py-0.5 ${isInside ? 'bg-green-600' : 'bg-red-100'}`}>
                    <p className={`text-[8px] font-bold text-center truncate px-1 ${isInside ? 'text-white' : 'text-red-800'}`}>
                      {student.name.split(' ')[0]}
                    </p>
                  </div>
                )}
                
                {/* Status Icon */}
                {isInside && <UserCheck size={12} className="absolute top-1 right-1 text-green-600"/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex justify-center flex-wrap gap-4 mt-2 px-4 pb-4">
         <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-400"></div> <span className="text-[10px] font-bold text-gray-500 uppercase">Morning</span>
         </div>
         <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-800"></div> <span className="text-[10px] font-bold text-gray-500 uppercase">Evening</span>
         </div>
         <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div> <span className="text-[10px] font-bold text-gray-500 uppercase">Inside</span>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;