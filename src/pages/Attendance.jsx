// src/pages/Attendance.jsx
import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Clock, Filter, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Attendance = () => {
  const navigate = useNavigate();
  const settings = useLiveQuery(() => db.settings.toArray());

  // --- DATE HELPERS ---
  const getToday = () => new Date().toISOString().slice(0, 10);
  
  const getMonthDates = (offset = 0) => {
    const date = new Date();
    date.setMonth(date.getMonth() + offset);
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10);
    return { start: firstDay, end: lastDay };
  };

  const [startDate, setStartDate] = useState(getMonthDates(0).start);
  const [endDate, setEndDate] = useState(getMonthDates(0).end);
  const [filteredLogs, setFilteredLogs] = useState([]);

  // --- PRESETS ---
  const setRange = (type) => {
    const today = getToday();
    if (type === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (type === 'yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().slice(0, 10);
        setStartDate(yStr);
        setEndDate(yStr);
    } else if (type === 'current') {
      const { start, end } = getMonthDates(0);
      setStartDate(start);
      setEndDate(end);
    } else if (type === 'prev') {
      const { start, end } = getMonthDates(-1);
      setStartDate(start);
      setEndDate(end);
    }
  };

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchLogs = async () => {
      const start = new Date(startDate); start.setHours(0, 0, 0, 0);
      const end = new Date(endDate); end.setHours(23, 59, 59, 999);

      const logs = await db.attendance
        .where('date')
        .between(start, end, true, true)
        .reverse()
        .toArray();

      const fullLogs = await Promise.all(logs.map(async (log) => {
        const student = await db.students.get(log.studentId);
        return { 
          ...log, 
          studentName: student?.name || 'Unknown',
          seatInfo: student?.seatType === 'Reserved' ? `Seat ${student.seat_no}` : 'General'
        };
      }));

      setFilteredLogs(fullLogs);
    };
    fetchLogs();
  }, [startDate, endDate]);

  const generatePDF = () => {
    try {
      const libName = settings?.find(s => s.key === 'libraryName')?.value || "Library";
      const doc = new jsPDF();

      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text(`${libName} - Attendance Report`, 105, 15, null, null, "center");
      
      doc.setFontSize(10);
      doc.text(`Period: ${startDate} to ${endDate}`, 105, 22, null, null, "center");

      const tableData = filteredLogs.map(log => [
        new Date(log.date).toLocaleDateString(),
        log.studentName,
        log.seatInfo,
        log.status.toUpperCase(),
        log.inTime ? new Date(log.inTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-',
        log.outTime ? new Date(log.outTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'
      ]);

      autoTable(doc, {
        head: [['Date', 'Name', 'Seat', 'Status', 'In Time', 'Out Time']],
        body: tableData,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 },
      });

      doc.save(`Attendance_${startDate}_to_${endDate}.pdf`);
    } catch (err) {
      alert("PDF Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2">
             <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 rounded-full"><ArrowLeft size={20}/></button>
             <h1 className="text-xl font-bold text-gray-800">Attendance Log</h1>
           </div>
           <button onClick={generatePDF} className="bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-xs font-bold shadow-lg">
             <Download size={16}/> Download PDF
           </button>
        </div>

        {/* PRESETS */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
          <button onClick={() => setRange('today')} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-bold text-gray-600 hover:bg-black hover:text-white transition-colors">Today</button>
          <button onClick={() => setRange('yesterday')} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-bold text-gray-600 hover:bg-black hover:text-white transition-colors">Yesterday</button>
          <button onClick={() => setRange('current')} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-bold text-gray-600 hover:bg-black hover:text-white transition-colors">This Month</button>
          <button onClick={() => setRange('prev')} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-bold text-gray-600 hover:bg-black hover:text-white transition-colors">Last Month</button>
        </div>

        {/* DATE PICKERS */}
        <div className="flex gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
           <div className="flex-1">
             <label className="text-[10px] font-bold text-gray-400 uppercase px-1">From</label>
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-white p-2 rounded-lg text-xs font-bold outline-none border border-gray-200" />
           </div>
           <div className="flex-1">
             <label className="text-[10px] font-bold text-gray-400 uppercase px-1">To</label>
             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-white p-2 rounded-lg text-xs font-bold outline-none border border-gray-200" />
           </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filteredLogs.map(log => (
          <div key={log.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className={`p-2 rounded-full ${log.status === 'In' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                 <Clock size={16}/>
               </div>
               <div>
                 <p className="font-bold text-sm text-gray-800">{log.studentName}</p>
                 <div className="flex items-center gap-2">
                    <p className="text-[10px] text-gray-400 bg-gray-50 px-1 rounded">{log.seatInfo}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1"><Calendar size={10}/> {new Date(log.date).toLocaleDateString()}</p>
                 </div>
               </div>
            </div>
            <div className="text-right">
               <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${log.status === 'In' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                 {log.status.toUpperCase()}
               </span>
               <p className="text-[10px] text-gray-400 mt-1 font-mono">
                 {log.inTime ? new Date(log.inTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}
               </p>
            </div>
          </div>
        ))}
        {filteredLogs.length === 0 && (
          <div className="text-center py-20 text-gray-400 flex flex-col items-center">
            <Filter size={48} className="mb-2 opacity-10"/>
            <p className="font-medium">No records for this period.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;