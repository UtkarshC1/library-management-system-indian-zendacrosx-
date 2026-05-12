import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useNavigate } from 'react-router-dom';
import { 
  Download, Clock, Filter, Calendar, Users, LogIn, LogOut, 
  ChevronRight, Activity, Zap, ShieldCheck, ClipboardList, Target, Plus 
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Html5QrcodeScanner } from 'html5-qrcode';

const Attendance = () => {
  const navigate = useNavigate();
  const students = useLiveQuery(() => db.students.toArray());
  const getToday = () => new Date().toISOString().slice(0, 10);
  
  const [mode, setMode] = useState('list'); // 'list', 'scan', 'manual'
  const [manualSearch, setManualSearch] = useState('');
  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  const [recentlyMarked, setRecentlyMarked] = useState(null);

  const markAttendanceManually = async (student) => {
    setIsProcessing(true);
    setRecentlyMarked(student.id);
    try {
      const todayLogs = await db.attendance
        .where('studentId').equals(student.id)
        .toArray();
      
      const lastLog = todayLogs
        .filter(l => new Date(l.date).toDateString() === new Date().toDateString())
        .sort((a, b) => b.date - a.date)[0];

      const newStatus = lastLog?.status === 'In' ? 'Out' : 'In';

      await db.attendance.add({
        studentId: student.id,
        date: new Date(),
        status: newStatus,
        inTime: newStatus === 'In' ? new Date() : null,
        outTime: newStatus === 'Out' ? new Date() : null
      });
      
      // Clear the indicator after 2 seconds
      setTimeout(() => setRecentlyMarked(null), 2000);
    } catch (err) { alert("Error: " + err.message); }
    setIsProcessing(false);
  };

  const setRange = (type) => {
    const d = new Date();
    const today = getToday();
    if (type === 'today') { setStartDate(today); setEndDate(today); }
    else if (type === 'yesterday') {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setStartDate(yStr); setEndDate(yStr);
    }
    else if (type === 'month') {
      setStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10));
      setEndDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10));
    }
    else if (type === 'prevMonth') {
      const pm = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      setStartDate(pm.toISOString().slice(0, 10));
      setEndDate(new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10));
    }
    else if (type === 'all') {
      setStartDate('2024-01-01');
      setEndDate(today);
    }
  };

  const processAttendance = async (decodedText) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const data = JSON.parse(decodedText);
      const id = data.uid || data.id;
      const student = await db.students.get(parseInt(id));
      if (!student) throw new Error("IDENTITY_NOT_FOUND");

      const todayLogs = await db.attendance.where('date').between(
        new Date(new Date().setHours(0,0,0,0)), 
        new Date(new Date().setHours(23,59,59,999)), 
        true, true
      ).toArray();
      const lastLog = todayLogs.filter(l => l.studentId === student.id).pop();
      const newStatus = lastLog?.status === 'In' ? 'Out' : 'In';

      await db.attendance.add({
        studentId: student.id,
        date: new Date(),
        status: newStatus,
        inTime: newStatus === 'In' ? new Date() : null,
        outTime: newStatus === 'Out' ? new Date() : null
      });
      setScanResult({ name: student.name, status: newStatus, id: student.id });
    } catch (err) { setScanError(err.message); }
    setTimeout(() => { setIsProcessing(false); setScanResult(null); setScanError(null); }, 3000);
  };

  useEffect(() => {
    if (mode === 'scan' && !isProcessing && !scanResult) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 280 }, false);
      scanner.render(processAttendance, () => {});
      return () => scanner.clear().catch(() => {});
    }
  }, [mode, isProcessing, scanResult]);

  useEffect(() => {
    const fetchLogs = async () => {
      const start = new Date(startDate); start.setHours(0,0,0,0);
      const end = new Date(endDate); end.setHours(23,59,59,999);
      const logs = await db.attendance.where('date').between(start, end, true, true).reverse().toArray();
      const full = await Promise.all(logs.map(async (l) => {
        const s = await db.students.get(l.studentId);
        return { ...l, name: s?.name || 'Unknown', seat: s?.seat_no ? `S-${s.seat_no}` : 'General', photo: s?.photo };
      }));
      setFilteredLogs(full);
    };
    fetchLogs();
  }, [startDate, endDate]);

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`ATTENDANCE REPORT`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 28);
    autoTable(doc, {
      head: [['Date', 'Student', 'Seat', 'Status', 'Time']],
      body: filteredLogs.map(l => [
        new Date(l.date).toLocaleDateString('en-IN'), 
        l.name, 
        l.seat, 
        l.status.toUpperCase() === 'IN' ? 'PRESENT' : 'LEFT', 
        l.inTime ? new Date(l.inTime).toLocaleTimeString() : new Date(l.outTime).toLocaleTimeString()
      ]),
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 }
    });
    doc.save(`Attendance_${startDate}.pdf`);
  };

  const totalActive = filteredLogs.filter(l => l.status === 'In').length;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 space-y-12 animate-reveal relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50 blur-[150px] -z-10 rounded-full"></div>
      
      {/* HUD Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-slate-200 pb-12">
        <div>
          <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                <ClipboardList size={22} strokeWidth={2.5} />
             </div>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Fleet Attendance</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-extrabold text-slate-900 tracking-tight leading-none mb-1">Attendance</h1>
          <p className="text-slate-500 font-medium">Real-time presence tracking and archival logs.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            {['list', 'scan', 'manual'].map(m => (
              <button key={m} onClick={() => setMode(m)} className={`px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${mode === m ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'}`}>
                {m === 'list' ? 'Ledger' : m === 'scan' ? 'Scanner' : 'Manual'}
              </button>
            ))}
          </div>
          <button onClick={generatePDF} className="btn-luxury btn-luxury-primary flex items-center justify-center gap-2 px-8">
             <Download size={18}/> Report
          </button>
        </div>
      </div>

      {mode === 'scan' ? (
        <div className="max-w-xl mx-auto animate-reveal space-y-8">
           <div className="luxury-card p-6 rounded-[3rem] bg-white border-slate-200 shadow-sm relative overflow-hidden">
              <div id="reader" className="rounded-3xl overflow-hidden"></div>
              {scanError && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-50 text-center p-8">
                   <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-6">
                      <Zap size={32}/>
                   </div>
                   <h2 className="text-xl font-bold text-slate-900 mb-2">{scanError}</h2>
                   <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Invalid Entry</p>
                </div>
              )}
              {scanResult && (
                <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center z-50 text-center p-8">
                   <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6 border ${scanResult.status === 'In' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                      {scanResult.status === 'In' ? <LogIn size={40}/> : <LogOut size={40}/>}
                   </div>
                   <h2 className="text-3xl font-display font-extrabold text-slate-900 mb-2">{scanResult.name}</h2>
                   <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${scanResult.status === 'In' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      {scanResult.status === 'In' ? 'Present' : 'Left'}
                   </div>
                </div>
              )}
           </div>
           <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-[0.3em]">Position QR Code within the frame</p>
        </div>
      ) : mode === 'manual' ? (
        <div className="max-w-4xl mx-auto animate-reveal space-y-8">
           <div className="relative group">
              <input 
                placeholder="Search student to mark attendance..." 
                value={manualSearch}
                onChange={e => setManualSearch(e.target.value)}
                className="luxury-card w-full pl-12 pr-6 py-5 bg-white border-slate-200 focus:border-blue-500 outline-none shadow-sm font-bold"
              />
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20}/>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {students?.filter(s => s.name.toLowerCase().includes(manualSearch.toLowerCase())).slice(0, 10).map(s => {
                const isRecentlyMarked = recentlyMarked === s.id;
                return (
                  <div key={s.id} onClick={() => markAttendanceManually(s)} className={`luxury-card p-6 flex items-center justify-between cursor-pointer transition-all duration-500 active:scale-[0.98] group ${isRecentlyMarked ? 'bg-blue-50 border-blue-400 scale-[1.02] shadow-lg ring-4 ring-blue-500/10' : 'bg-white hover:bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden shadow-sm group-hover:rotate-2 transition-transform">
                          {s.photo ? <img src={s.photo} className="w-full h-full object-cover" /> : <User className="m-auto mt-4 text-slate-300" size={24}/>}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-lg tracking-tight">{s.name}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                             <Target size={10} className="text-blue-500"/> ID: #{s.id.toString().padStart(4, '0')}
                          </p>
                        </div>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isRecentlyMarked ? 'bg-blue-600 text-white animate-[reveal_0.3s_ease-out]' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                        {isRecentlyMarked ? <ShieldCheck size={24} strokeWidth={2.5}/> : <Plus size={20} strokeWidth={2.5}/>}
                    </div>
                  </div>
                );
              })}
           </div>
        </div>
      ) : (
        <>
          {/* Metrics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="luxury-card p-8 flex items-center justify-between bg-white border-slate-200 relative overflow-hidden group shadow-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <div>
                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em] mb-2">Total Logs</p>
                   <h3 className="text-4xl font-display font-extrabold text-slate-900 tracking-tight">{filteredLogs.length}</h3>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500"><Users size={24}/></div>
             </div>
             <div className="luxury-card p-8 flex items-center justify-between bg-blue-50/50 border-blue-100 relative overflow-hidden group shadow-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <div>
                   <p className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.4em] mb-2">Present</p>
                   <h3 className="text-4xl font-display font-extrabold text-blue-600 tracking-tight">{totalActive}</h3>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm"><LogIn size={24} strokeWidth={2.5}/></div>
             </div>
             <div className="luxury-card p-8 flex items-center justify-between bg-white border-slate-200 relative overflow-hidden group shadow-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                <div>
                   <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em] mb-2">Active Students</p>
                   <h3 className="text-4xl font-display font-extrabold text-slate-900 tracking-tight">{students?.filter(s => s.status === 'Active').length || 0}</h3>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500"><ShieldCheck size={24}/></div>
             </div>
          </div>

          {/* Control Terminal */}
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
             <div className="flex flex-wrap gap-2">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'month', label: 'This Month' },
                  { id: 'prevMonth', label: 'Prev Month' },
                  { id: 'all', label: 'All Time' }
                ].map(r => (
                  <button key={r.id} onClick={() => setRange(r.id)} className="px-6 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all hover:bg-blue-50 hover:text-blue-600 text-slate-500 border border-slate-100">
                     {r.label}
                  </button>
                ))}
             </div>
             
             <div className="flex flex-col md:flex-row gap-6 justify-between items-center pt-6 border-t border-slate-100">
                <div className="flex items-center gap-6">
                   <div className="text-right">
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Start Date</p>
                      <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="bg-transparent text-slate-900 font-bold text-sm outline-none border-b border-slate-200 focus:border-blue-400 transition-all py-1" />
                   </div>
                   <div className="w-px h-8 bg-slate-200"></div>
                   <div className="text-left">
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">End Date</p>
                      <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="bg-transparent text-slate-900 font-bold text-sm outline-none border-b border-slate-200 focus:border-blue-400 transition-all py-1" />
                   </div>
                </div>
                <button className="w-full md:w-auto px-12 py-4 bg-blue-600 text-white rounded-2xl shadow-sm active:scale-95 transition-all hover:bg-blue-700 font-bold text-xs uppercase tracking-widest">Apply Filter</button>
             </div>
          </div>
        </>
      )}

      {/* Ledger Grid */}
      <div className="luxury-table-container">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"></div>
         <table className="luxury-table">
            <thead>
               <tr>
                  <th>Student Details</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="text-right">Time</th>
                  <th className="text-right">Action</th>
               </tr>
            </thead>
            <tbody>
               {filteredLogs.map(log => (
                 <tr key={log.id} className="group cursor-pointer hover:bg-slate-50 transition-colors">
                    <td>
                       <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden p-0.5 shadow-sm group-hover:rotate-3 transition-transform">
                             {log.photo ? <img src={log.photo} className="w-full h-full object-cover rounded-xl" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100"><Users size={20}/></div>}
                          </div>
                          <div>
                             <p className="text-lg font-bold text-slate-900 tracking-tight leading-none mb-1.5 group-hover:text-blue-600 transition-colors">{log.name}</p>
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">SEAT: {log.seat}</span>
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">ID: #{log.studentId}</span>
                             </div>
                          </div>
                       </div>
                    </td>
                    <td>
                       <div className="flex items-center gap-3 text-slate-600 font-bold text-xs">
                          <Calendar size={14} className="text-slate-400"/> {new Date(log.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}
                       </div>
                    </td>
                    <td>
                       <span className={`px-5 py-2 rounded-xl text-[9px] font-bold uppercase tracking-[0.3em] border shadow-sm transition-all ${log.status === 'In' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {log.status === 'In' ? 'Present' : 'Left'}
                       </span>
                    </td>
                    <td className="text-right">
                       <div className="flex flex-col items-end">
                          <p className="text-xl font-display font-extrabold text-slate-900 tracking-tight">{log.inTime ? new Date(log.inTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : new Date(log.outTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Recorded</p>
                       </div>
                    </td>
                    <td className="text-right">
                       <button onClick={() => navigate(`/student/${log.studentId}`)} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all"><ChevronRight size={18}/></button>
                    </td>
                 </tr>
               ))}
            </tbody>
         </table>
         {filteredLogs.length === 0 && (
           <div className="text-center py-48 opacity-60">
              <Zap size={48} className="mx-auto mb-6 text-slate-300"/>
              <h3 className="text-xl font-display font-bold text-slate-900 uppercase tracking-[0.4em]">No Records Found</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">No attendance data exists in this date range.</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default Attendance;