import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, User, AlertCircle, Calendar, Download, IdCard } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

const Students = () => {
  const navigate = useNavigate();
  const students = useLiveQuery(() => db.students.toArray());
  const rooms = useLiveQuery(() => db.rooms.toArray());
  const settings = useLiveQuery(() => db.settings.toArray());
  const allTransactions = useLiveQuery(() => db.finance.toArray());
  const allAttendance = useLiveQuery(() => db.attendance.toArray());
  
  const [search, setSearch] = useState('');

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

  // --- 🎨 PRO ID CARD GENERATOR ---
  const generateIDCard = async (e, student) => {
    e.stopPropagation();
    // 85.6mm x 54mm (Standard Credit Card)
    const doc = new jsPDF('landscape', 'mm', [85.6, 54]);
    
    // Background & Border
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(0, 0, 85.6, 54, 2, 2, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.roundedRect(0, 0, 85.6, 54, 2, 2, 'S');

    // Left Colored Panel (Brand Color)
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(0, 0, 26, 54, 'F');

    // Photo
    if (student.photo) {
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.rect(3, 10, 20, 24, 'S');
        doc.addImage(student.photo, 'JPEG', 3.2, 10.2, 19.6, 23.6);
    } else {
        doc.setFillColor(240, 240, 240);
        doc.rect(3, 10, 20, 24, 'F');
    }

    // ID Number (on Blue panel)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`ID: ${student.id}`, 13, 39, null, null, "center");

    // Header (Library Name)
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(libraryName.toUpperCase().substring(0, 25), 30, 8); // Truncate if too long

    // Address Tagline
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(libraryAddress.substring(0, 40), 30, 11);

    // Separator
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.2);
    doc.line(30, 13, 80, 13);

    // Student Details
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(student.name.substring(0, 20), 30, 20);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    let y = 26;
    
    // Calculate Valid Till (6 months from admission or today)
    const admitDate = student.admissionDate ? new Date(student.admissionDate) : new Date();
    const validDate = new Date(admitDate);
    validDate.setMonth(validDate.getMonth() + 6);

    const details = [
        { l: "Father", v: student.fathersName || '-' },
        { l: "Mobile", v: student.mobile },
        { l: "Shift", v: student.shift || 'Full Day' },
        { l: "Seat", v: student.seatType === 'Reserved' ? `${student.seat_no}` : 'General' },
        { l: "Valid Till", v: validDate.toLocaleDateString() }
    ];

    details.forEach(row => {
        doc.setTextColor(120); 
        doc.text(row.l + ":", 30, y);
        doc.setTextColor(0);   
        doc.text(row.v, 45, y);
        y += 4;
    });

    // QR Code
    try {
        const qrDataUrl = await QRCode.toDataURL(student.id.toString(), { margin: 0 });
        doc.addImage(qrDataUrl, 'PNG', 68, 36, 15, 15);
    } catch (err) {}

    doc.save(`${student.name}_ID_Card.pdf`);
  };

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
            <button onClick={generateListPDF} className="bg-blue-50 text-blue-600 p-2 rounded-lg flex items-center gap-2 text-xs font-bold active:scale-95 transition-transform">
                <Download size={16}/> Report
            </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            placeholder="Search name or mobile..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl focus:bg-white focus:ring-2 ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filtered?.map((student) => {
           const feeStatus = checkFeeStatus(student.id);
           const daysPresent = countAttendance(student.id);
           const seatText = student.seatType === 'Reserved' ? `${getRoomName(student.roomId)} • ${student.seat_no}` : "General";

           return (
            <div key={student.id} onClick={() => navigate(`/student/${student.id}`)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer relative overflow-hidden active:bg-gray-50 transition-colors">
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
                {/* ID Card Button */}
                <button onClick={(e) => generateIDCard(e, student)} className="p-2 rounded-full bg-gray-50 text-gray-600 hover:bg-black hover:text-white transition-colors" title="Download ID Card">
                    <IdCard size={20}/>
                </button>
            </div>
           );
        })}
      </div>
      <button onClick={() => navigate('/admission')} className="fixed bottom-20 right-5 bg-black text-white p-4 rounded-full shadow-2xl z-20 active:scale-90 transition-transform"><Plus size={28} /></button>
    </div>
  );
};

export default Students;