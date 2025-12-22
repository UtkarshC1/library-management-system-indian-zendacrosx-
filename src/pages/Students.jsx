import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, User, AlertCircle, Calendar, Download, IdCard } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // <--- CHANGED IMPORT
import QRCode from 'qrcode';

const Students = () => {
  const navigate = useNavigate();
  const students = useLiveQuery(() => db.students.toArray());
  const rooms = useLiveQuery(() => db.rooms.toArray());
  const settings = useLiveQuery(() => db.settings.toArray());
  const allTransactions = useLiveQuery(() => db.finance.toArray());
  const allAttendance = useLiveQuery(() => db.attendance.toArray());
  
  const [search, setSearch] = useState('');

  // Helpers
  const getSetting = (key) => settings?.find(s => s.key === key)?.value || '';
  const libraryName = getSetting('libraryName') || "Granthalaya Library";
  const libraryAddress = getSetting('libraryAddress') || "Main Reading Hall";
  const getRoomName = (id) => rooms?.find(r => r.id === id)?.name || 'Unknown';

  const checkFeeStatus = (studentId) => {
    if (!allTransactions) return 'ok';
    const payments = allTransactions.filter(t => t.studentId === studentId && t.type === 'Income');
    if (payments.length === 0) return 'due';
    const lastPay = payments.sort((a,b) => b.date - a.date)[0];
    const daysSince = (new Date() - lastPay.date) / (1000 * 60 * 60 * 24);
    return daysSince > 30 ? 'due' : 'ok';
  };

  const countAttendance = (studentId) => {
    if (!allAttendance) return 0;
    const logs = allAttendance.filter(l => l.studentId === studentId && l.status === 'In');
    const uniqueDays = new Set(logs.map(l => l.date.toDateString()));
    return uniqueDays.size;
  };

  // --- ID CARD GENERATOR ---
  const generateIDCard = async (e, student) => {
    e.stopPropagation();
    const doc = new jsPDF('landscape', 'mm', [85.6, 54]);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(1, 1, 83.6, 52, 3, 3, 'F'); 
    
    // Left Blue
    doc.setFillColor(30, 64, 175); 
    doc.path([{ op: 'm', c: [4, 1] }, { op: 'l', c: [30, 1] }, { op: 'l', c: [25, 53] }, { op: 'l', c: [4, 53] }, { op: 'c', c: [1, 53, 1, 53, 1, 50] }, { op: 'l', c: [1, 4] }, { op: 'c', c: [1, 1, 1, 1, 4, 1] }, { op: 'h' }]);
    doc.fill();

    // Photo
    if (student.photo) {
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.rect(5, 10, 20, 24, 'S'); 
        doc.addImage(student.photo, 'JPEG', 5.2, 10.2, 19.6, 23.6);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`ID: ${student.id}`, 15, 39, null, null, "center");

    // Right Details
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(10);
    doc.text(libraryName.toUpperCase(), 55, 8, null, null, "center");
    
    doc.setTextColor(0, 0, 0); 
    doc.setFontSize(11);
    doc.text(student.name.toUpperCase(), 32, 18);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    let y = 23;
    const details = [
        { label: "Father", val: student.fathersName || '-' },
        { label: "Mobile", val: student.mobile },
        { label: "Shift", val: `${student.startTime || ''} - ${student.endTime || ''}` },
        { label: "Seat", val: student.seatType === 'Reserved' ? `${student.seat_no} (${getRoomName(student.roomId)})` : 'General' }
    ];
    details.forEach(item => {
        doc.setTextColor(120); doc.text(item.label + ":", 32, y);
        doc.setTextColor(0);   doc.text(item.val, 45, y);
        y += 3.5;
    });

    try {
        const qrDataUrl = await QRCode.toDataURL(student.id.toString(), { margin: 0 });
        doc.addImage(qrDataUrl, 'PNG', 67, 36, 14, 14);
    } catch (err) {}

    doc.save(`${student.name}_Card.pdf`);
  };

  // --- REPORT PDF (FIXED) ---
  const generateListPDF = () => {
    const doc = new jsPDF();
    doc.text(`${libraryName} - Student Report`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableData = students.map(s => [
      s.name,
      s.mobile,
      s.seatType === 'Reserved' ? `${getRoomName(s.roomId)} (S-${s.seat_no})` : 'General',
      checkFeeStatus(s.id) === 'due' ? 'OVERDUE' : 'Paid',
      countAttendance(s.id) + ' Days'
    ]);

    // FIX: Using autoTable(doc, ...)
    autoTable(doc, {
      head: [['Name', 'Mobile', 'Allocation', 'Fee Status', 'Attendance']],
      body: tableData,
      startY: 30,
    });

    doc.save(`Student_Report.pdf`);
  };

  const filtered = students?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.mobile.includes(search)
  ).reverse();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b border-gray-100">
        <div className="flex justify-between items-center mb-3">
            <h1 className="text-2xl font-bold text-gray-800">Students</h1>
            <button onClick={generateListPDF} className="bg-blue-50 text-blue-600 p-2 rounded-lg flex items-center gap-2 text-xs font-bold">
                <Download size={16}/> Report
            </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            placeholder="Search name or mobile..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl focus:bg-white focus:ring-2 ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filtered?.map((student) => {
           const feeStatus = checkFeeStatus(student.id);
           const daysPresent = countAttendance(student.id);
           const seatText = student.seatType === 'Reserved' ? `${getRoomName(student.roomId)} • ${student.seat_no}` : "General";

           return (
            <div key={student.id} onClick={() => navigate(`/student/${student.id}`)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer relative overflow-hidden">
                {feeStatus === 'due' && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>}
                <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                  {student.photo ? <img src={student.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={20}/></div>}
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h3 className="font-bold text-gray-800">{student.name}</h3>
                        {feeStatus === 'due' && <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold"><AlertCircle size={10}/> DUE</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700">{seatText}</span>
                        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1"><Calendar size={10}/> {daysPresent} Days</span>
                    </div>
                </div>
                <button onClick={(e) => generateIDCard(e, student)} className="bg-gray-100 p-2 rounded-full text-gray-600 hover:bg-black hover:text-white"><IdCard size={20}/></button>
            </div>
           );
        })}
      </div>
      <button onClick={() => navigate('/admission')} className="fixed bottom-20 right-5 bg-black text-white p-4 rounded-full shadow-2xl z-20"><Plus size={28} /></button>
    </div>
  );
};

export default Students;