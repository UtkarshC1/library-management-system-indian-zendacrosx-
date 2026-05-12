import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ChevronDown, UserCheck, Clock, AlertCircle, Users, IndianRupee, Activity, ArrowUpRight, Zap, Target, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const rooms = useLiveQuery(() => db.rooms.toArray());
  const students = useLiveQuery(() => db.students.where('status').equals('Active').toArray());
  const finance = useLiveQuery(() => db.finance.toArray());
  const allAttendance = useLiveQuery(() => db.attendance.toArray());
  
  const [now, setNow] = useState(new Date());
  const [selectedRoomId, setSelectedRoomId] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (rooms?.length > 0 && !selectedRoomId) setSelectedRoomId(rooms[0].id);
  }, [rooms, selectedRoomId]);

  if (!rooms || !students || !finance || !allAttendance) return null;

  const totalExpectedFees = students.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);
  const currentMonthRevenue = finance
    .filter(t => t.type === 'Income' && new Date(t.date).getMonth() === now.getMonth())
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPaidCurrentMonth = finance
    .filter(t => t.type === 'Income' && t.category === 'Fee' && new Date(t.date).getMonth() === now.getMonth())
    .reduce((sum, t) => sum + t.amount, 0);
  const feesDue = totalExpectedFees - totalPaidCurrentMonth;

  const activeAttendance = new Map(
    allAttendance
      .filter(l => l.status === 'In' && new Date(l.date).toDateString() === now.toDateString())
      .map(l => [l.studentId, l])
  );

  const currentRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];
  const seats = Array.from({ length: currentRoom?.capacity || 0 }, (_, i) => i + 1);
  const roomStudents = students.filter(s => s.roomId === selectedRoomId);
  const seatMap = Object.fromEntries(roomStudents.map(s => [s.seat_no, s]));

  const getSeatStatus = (student, isInside) => {
    if (!student) return { style: 'bg-slate-50 border-slate-200 text-slate-500', label: 'AVAILABLE' };
    if (isInside) {
      if (student.endTime) {
        const [h, m] = student.endTime.split(':');
        const endTime = new Date(); endTime.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
        if (now > endTime) return { style: 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm', label: 'OVERSTAY', glow: 'bg-orange-500' };
      }
      return { style: 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm', label: 'INSIDE', glow: 'bg-blue-500' };
    }
    return { style: 'bg-white border-slate-200 text-slate-500', label: 'ABSENT' };
  };

  const KPICard = ({ title, value, icon: Icon, colorClass, gradient }) => (
    <div className="luxury-card luxury-card-hover p-4 sm:p-8 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 ${gradient} opacity-10 blur-3xl -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700`}></div>
      <div className="flex justify-between items-start mb-4 sm:mb-6">
        <div className={`w-10 h-10 sm:w-14 h-14 rounded-xl sm:rounded-2xl flex items-center justify-center border border-slate-100 ${colorClass.replace('bg-', 'bg-opacity-10 text-')} shadow-sm transition-transform group-hover:rotate-6`}>
           <Icon size={20} className={`${colorClass.replace('bg-', 'text-')} sm:w-7 sm:h-7`} strokeWidth={2.5}/>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           <Zap size={12} className="text-blue-500"/> REAL-TIME
        </div>
      </div>
      <div>
        <h3 className="text-2xl sm:text-4xl font-display font-extrabold text-slate-900 tracking-tight mb-1 sm:mb-2">{value}</h3>
        <p className="text-[10px] sm:text-sm font-bold text-slate-500 uppercase tracking-widest">{title}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 space-y-12 animate-reveal">
      
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative">
         <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100 blur-[120px] -z-10 rounded-full"></div>
         <div>
            <div className="flex items-center gap-3 mb-4">
               <div className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-full flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">System Active</span>
               </div>
               <span className="text-xs text-slate-500 font-bold uppercase tracking-widest px-3 py-1 border-l border-slate-200">{now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-slate-900 tracking-tight leading-none mb-4">Dashboard</h1>
            <p className="text-sm sm:text-lg text-slate-500 font-medium max-w-lg leading-relaxed">Integrated monitoring and management system for your library infrastructure.</p>
         </div>
         <div className="flex items-center gap-4">
            <button className="btn-luxury btn-luxury-secondary px-4 sm:px-6 py-3 sm:py-4">
               <Activity size={20}/>
               <span className="hidden sm:inline">Analytics</span>
            </button>
            <button onClick={() => navigate('/attendance')} className="btn-luxury btn-luxury-primary px-6 sm:px-8 py-3 sm:py-4">
               <Zap size={20}/>
               <span>Mark Attendance</span>
            </button>
         </div>
      </div>

      {/* Analytics Hub */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
        <KPICard title="Total Students" value={students.length} icon={Users} colorClass="bg-blue-500" gradient="bg-blue-200" />
        <KPICard title="Present Today" value={activeAttendance.size} icon={Target} colorClass="bg-emerald-500" gradient="bg-emerald-200" />
        <KPICard title="Revenue (Month)" value={`₹${currentMonthRevenue.toLocaleString('en-IN')}`} icon={IndianRupee} colorClass="bg-indigo-500" gradient="bg-indigo-200" />
        <KPICard title="Fees Dues" value={`₹${feesDue.toLocaleString('en-IN')}`} icon={AlertCircle} colorClass="bg-rose-500" gradient="bg-rose-200" />
      </div>

      {/* Advanced Infrastructure Grid */}
      <div className="space-y-8 relative">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 border-b border-slate-200 pb-8">
           <div className="flex items-center gap-6">
              <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Seat Matrix</h2>
              <div className="relative group">
                <select 
                  value={selectedRoomId || ''} 
                  onChange={(e) => setSelectedRoomId(parseInt(e.target.value))}
                  className="appearance-none luxury-card px-6 py-3 pr-12 text-sm font-bold text-blue-600 hover:border-blue-300 transition-all cursor-pointer outline-none shadow-none"
                >
                  {rooms.map(r => <option key={r.id} value={r.id} className="bg-white">{r.name}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none group-hover:scale-110 transition-transform" size={18} />
              </div>
           </div>
           
           <div className="flex items-center gap-8 bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl">
              {['INSIDE', 'ABSENT', 'AVAILABLE'].map(label => (
                <div key={label} className="flex items-center gap-3">
                   <div className={`w-2 h-2 rounded-full ${label === 'INSIDE' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : label === 'ABSENT' ? 'bg-slate-400' : 'bg-slate-200'}`}></div>
                   <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{label}</span>
                </div>
              ))}
           </div>
        </div>

        <div className="luxury-card p-4 md:p-8 overflow-x-auto custom-scrollbar border-slate-200 relative">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"></div>
           <div 
              className="grid gap-2 sm:gap-4" 
              style={{ gridTemplateColumns: `repeat(${currentRoom?.cols || 5}, minmax(60px, 1fr))` }}
           >
              {seats.map((seatNum) => {
                const student = seatMap[seatNum];
                const isInside = student && activeAttendance?.has(student.id);
                const status = getSeatStatus(student, isInside);

                return (
                  <div 
                    key={seatNum}
                    onClick={() => student && navigate(`/student/${student.id}`)}
                    className={`
                      h-16 sm:h-20 rounded-xl border flex flex-col items-center justify-center relative transition-all duration-500 group overflow-hidden
                      ${status.style} ${student ? 'cursor-pointer hover:scale-[1.05] hover:z-20 shadow-sm' : 'opacity-40'}
                    `}
                  >
                    <div className="absolute top-1 left-2 flex items-center gap-1">
                       <span className="text-[6px] font-bold tracking-widest text-slate-400">{seatNum}</span>
                       {status.glow && <div className={`w-1 h-1 rounded-full ${status.glow} animate-pulse`}></div>}
                    </div>
                    
                    {student ? (
                      <div className="flex flex-col items-center gap-1 px-1 text-center z-10 w-full">
                         <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-white p-0.5 border border-slate-200 shadow-sm relative group-hover:rotate-6 transition-transform">
                            {student.photo ? <img src={student.photo} className="w-full h-full object-cover rounded-md" /> : <Users size={12} className="m-auto mt-1.5 text-slate-400"/>}
                            {isInside && <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white"></div>}
                         </div>
                         <div className="space-y-0 hidden sm:block">
                            <p className="text-[8px] font-bold text-slate-900 tracking-tight uppercase group-hover:text-blue-600 transition-colors truncate max-w-[50px]">{student.name.split(' ')[0]}</p>
                         </div>
                      </div>
                    ) : (
                      <div className="w-1 h-1 rounded-full bg-slate-200 group-hover:bg-blue-100 transition-colors"></div>
                    )}
                  </div>
                );
              })}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;