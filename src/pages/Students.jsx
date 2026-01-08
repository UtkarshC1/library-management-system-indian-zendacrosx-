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
  const libraryName = getSetting('libraryName') || "Library Management System";
  const libraryAddress = getSetting('libraryAddress') || "Reading Hall, City Center";
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

  // --- 🎨 CLEAN & PROFESSIONAL ID CARD ---
  const generateIDCard = async (e, student) => {
    e.stopPropagation();
    // Standard Credit Card Size: 85.6mm x 54mm
    const doc = new jsPDF('landscape', 'mm', [85.6, 54]);
    
    // --- 1. BACKGROUND DESIGN ---
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 85.6, 54, 'F');

    // Geometric Accents (Deep Blue & Gold)
    doc.setFillColor(30, 58, 138); // Deep Blue
    doc.triangle(0, 0, 60, 0, 0, 45, 'F');
    
    doc.setFillColor(37, 99, 235); // Bright Blue Overlay
    doc.triangle(0, 0, 40, 0, 0, 25, 'F');

    doc.setFillColor(245, 158, 11); // Bottom Gold Strip
    doc.rect(0, 52, 85.6, 2, 'F');

    // --- 2. HEADER INFO (Right Aligned) ---
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(9);
    doc.text(libraryName.toUpperCase().substring(0, 25), 82, 7, null, null, "right");
    
    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(libraryAddress.substring(0, 45), 82, 10, null, null, "right");

    // --- 3. PHOTO SECTION ---
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(1);
    doc.rect(5, 12, 21, 25, 'S'); // White border around photo
    
    if (student.photo) {
        doc.addImage(student.photo, 'JPEG', 5.5, 12.5, 20, 24);
    } else {
        doc.setFillColor(240, 240, 240);
        doc.rect(5.5, 12.5, 20, 24, 'F');
        doc.setFontSize(5);
        doc.setTextColor(150);
        doc.text("NO PHOTO", 15.5, 25, null, null, "center");
    }

    // Active Status Badge
    doc.setFillColor(22, 163, 74); // Green
    doc.roundedRect(5.5, 38, 20, 4, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text("ACTIVE MEMBER", 15.5, 40.5, null, null, "center");

    // --- 4. STUDENT DETAILS ---
    doc.setTextColor(15, 23, 42); // Dark Slate
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(student.name.toUpperCase().substring(0, 22), 30, 18);

    // ID Pill
    doc.setFillColor(30, 58, 138);
    doc.roundedRect(30, 20, 18, 4, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text(`ID: ${student.id}`, 39, 22.8, null, null, "center");

    // Info Lines
    let y = 29;
    const addDetail = (label, val) => {
        doc.setFontSize(6);
        doc.setTextColor(100); // Label Gray
        doc.text(label.toUpperCase(), 30, y);
        
        doc.setTextColor(0); // Value Black
        doc.setFont("helvetica", "bold");
        doc.text(val || "-", 50, y);
        y += 5; // Increased spacing for cleaner look
    };

    addDetail("Father's Name", student.fathersName);
    addDetail("Mobile No", student.mobile);
    
    // Address (Bottom Line)
    doc.setFontSize(6);
    doc.setTextColor(100);
    doc.text("ADDRESS", 30, y);
    doc.setTextColor(0);
    doc.setFontSize(5);
    const addr = student.address || "";
    doc.text(addr.substring(0, 35) + (addr.length > 35 ? "..." : ""), 50, y);

    // --- 5. SEAT ALLOCATION BOX ---
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.2);
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(55, 43, 28, 7, 1, 1, 'FD');
    
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const seatText = student.seatType === 'Reserved' ? `S-${student.seat_no} (${getRoomName(student.roomId)})` : "GENERAL ACCESS";
    doc.text(seatText, 69, 47.5, null, null, "center");

    // --- 6. HIGH-DETAIL QR CODE ---
    try {
        // Including more data creates a denser ("more detailed") QR code pattern
        // The ID guarantees uniqueness.
        const qrPayload = JSON.stringify({
            uid: student.id,
            n: student.name,
            f: student.fathersName,
            m: student.mobile,
            s: student.seatType === 'Reserved' ? student.seat_no : 'Gen'
        });
        
        const qrUrl = await QRCode.toDataURL(qrPayload, { margin: 0, errorCorrectionLevel: 'Q' });
        doc.addImage(qrUrl, 'PNG', 68, 15, 14, 14);
    } catch(err) {}

    // Save
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

  // Filter Logic
  const filtered = students?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.mobile.includes(search) ||
    (s.seat_no && s.seat_no.toString().includes(search))
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
            placeholder="Search name, mobile or seat..." 
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