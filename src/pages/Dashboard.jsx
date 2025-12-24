import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ChevronDown, UserCheck, Clock, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const rooms = useLiveQuery(() => db.rooms.toArray());
  const students = useLiveQuery(() => db.students.where('status').equals('Active').toArray());
  
  // State to trigger re-render every minute for time checks
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every min
    return () => clearInterval(timer);
  }, []);

  // Real-time "Who is inside" check
  const activeAttendance = useLiveQuery(async () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const logs = await db.attendance.where('date').above(today).toArray();
    const insideSet = new Set();
    
    // Group by student to get latest log
    const statusMap = {};
    logs.forEach(l => statusMap[l.studentId] = l.status);
    Object.keys(statusMap).forEach(id => {
        if(statusMap[id] === 'In') insideSet.add(parseInt(id));
    });
    return insideSet;
  });

  const [selectedRoomId, setSelectedRoomId] = useState(null);

  useEffect(() => {
    if (rooms && rooms.length > 0 && !selectedRoomId) setSelectedRoomId(rooms[0].id);
  }, [rooms]);

  if (!rooms || !students) return <div className="p-10 text-center">Loading...</div>;
  if (rooms.length === 0) return <div className="p-10 text-center">No Rooms Configured.</div>;

  const currentRoom = rooms.find(r => r.id === parseInt(selectedRoomId));
  const roomStudents = students.filter(s => s.roomId === parseInt(selectedRoomId));

  const seatMap = {};
  roomStudents.forEach(s => {
    if (s.seat_no) {
       seatMap[s.seat_no] = s;
    }
  });

  const seats = Array.from({ length: currentRoom?.capacity || 0 }, (_, i) => i + 1);
  const actuallyInsideCount = roomStudents.filter(s => activeAttendance?.has(s.id)).length;

  // --- HELPER: DETERMINE SEAT STATUS COLOR ---
  const getSeatStatus = (student, isInside) => {
    if (!student) return { 
        style: 'bg-white border-gray-200 text-gray-300', 
        icon: null 
    };

    // 1. CHECK OVERSTAY (Inside + Past End Time) -> ORANGE
    if (isInside && student.endTime) {
        const [h, m] = student.endTime.split(':');
        const endTime = new Date(); endTime.setHours(h, m, 0);
        if (now > endTime) {
            return { 
                style: 'bg-orange-100 border-orange-300 text-orange-700 animate-pulse', 
                icon: <Clock size={12} className="absolute top-1 right-1"/>,
                label: 'OVERSTAY'
            };
        }
    }

    // 2. STANDARD INSIDE -> GREEN
    if (isInside) {
        return { 
            style: 'bg-green-100 border-green-300 text-green-700', 
            icon: <UserCheck size={12} className="absolute top-1 right-1"/> 
        };
    }

    // 3. CHECK ABSENT/LATE (Reserved + Not Inside + Within Shift) -> PURPLE
    if (student.seatType === 'Reserved' && student.startTime && student.endTime) {
        const [sH, sM] = student.startTime.split(':');
        const startTime = new Date(); startTime.setHours(sH, sM, 0);

        const [eH, eM] = student.endTime.split(':');
        const endTime = new Date(); endTime.setHours(eH, eM, 0);

        // If current time is between Start & End, but they are NOT inside
        if (now >= startTime && now <= endTime) {
            return { 
                style: 'bg-purple-100 border-purple-300 text-purple-700', 
                icon: <AlertCircle size={12} className="absolute top-1 right-1"/>,
                label: 'ABSENT'
            };
        }
    }

    // 4. STANDARD AWAY -> RED
    return { 
        style: 'bg-red-50 border-red-200 text-red-400', 
        icon: null 
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 animate-fade-in">
      {/* HEADER */}
      <div className="bg-white sticky top-0 z-10 shadow-sm border-b border-gray-100 px-4 py-3 flex justify-between items-center">
        <div className="relative">
          <select 
            value={selectedRoomId || ''}
            onChange={(e) => setSelectedRoomId(parseInt(e.target.value))}
            className="appearance-none bg-transparent font-bold text-xl text-gray-800 pr-8 outline-none"
          >
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
        </div>

        {/* LEGEND / COUNTERS */}
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-wider">
           <div className="text-center">
              <span className="block text-lg text-green-600">{actuallyInsideCount}</span> 
              <span className="text-gray-400">Inside</span>
           </div>
           <div className="w-px h-8 bg-gray-100"></div>
           <div className="text-center">
              <span className="block text-lg text-red-500">{roomStudents.length - actuallyInsideCount}</span> 
              <span className="text-gray-400">Away</span>
           </div>
        </div>
      </div>

      {/* GRID */}
      <div className="p-4">
        <div 
            className="grid gap-3 mx-auto" 
            style={{ gridTemplateColumns: `repeat(${currentRoom?.cols || 5}, minmax(0, 1fr))` }}
        >
          {seats.map((seatNum) => {
            const student = seatMap[seatNum];
            const isInside = student && activeAttendance?.has(student.id);
            const status = getSeatStatus(student, isInside);

            return (
              <div 
                key={seatNum}
                className={`
                  aspect-square rounded-xl flex flex-col items-center justify-center border transition-all relative overflow-hidden shadow-sm
                  ${status.style}
                `}
              >
                <span className="text-sm font-bold">{seatNum}</span>

                {student && (
                  <>
                    <div className={`absolute bottom-0 w-full py-0.5 ${isInside ? 'bg-green-600' : (status.label === 'ABSENT' ? 'bg-purple-600' : 'bg-red-100')}`}>
                        <p className={`text-[8px] font-bold text-center truncate px-1 ${isInside || status.label === 'ABSENT' ? 'text-white' : 'text-red-800'}`}>
                        {student.name.split(' ')[0]}
                        </p>
                    </div>
                    {status.icon}
                  </>
                )}
              </div>
            );
          })}
        </div>
        
        {/* LEGEND FOOTER */}
        <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div><span className="text-[10px] text-gray-500 font-bold">Inside</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div><span className="text-[10px] text-gray-500 font-bold">Away</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div><span className="text-[10px] text-gray-500 font-bold">Absent (Shift Active)</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div><span className="text-[10px] text-gray-500 font-bold">Overstay</span></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;