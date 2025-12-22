import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useNavigate } from 'react-router-dom';
import { Camera, Save, ArrowLeft, Armchair, Upload, FileText, User, MapPin, Phone, Clock, IndianRupee, CreditCard } from 'lucide-react';
import jsPDF from 'jspdf';

const Admission = () => {
  const navigate = useNavigate();
  const rooms = useLiveQuery(() => db.rooms.toArray());
  
  // --- STATE MANAGEMENT ---
  const [formData, setFormData] = useState({
    name: '',
    fathersName: '',
    address: '',
    mobile: '',
    emergencyContact: '',
    aadharNo: '', // <--- NEW FIELD
    roomId: '',
    seatType: 'Reserved',
    seat_no: '',
    monthlyFee: '',
    startTime: '08:00',
    endTime: '14:00',
    photo: null,
    aadhar: null // This is the image
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // Handle Image Uploads (Photo & Aadhar)
  const handleFile = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, [field]: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  // --- PDF GENERATION ---
  const generateAdmissionPDF = (data) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("LIBRARY ADMISSION FORM", pageWidth / 2, 20, null, null, "center");
    doc.setFontSize(10);
    doc.text("Official Registration Document", pageWidth / 2, 28, null, null, "center");
    
    doc.setTextColor(0, 0, 0);

    // --- STUDENT PHOTO ---
    doc.setDrawColor(200, 200, 200);
    doc.rect(150, 50, 40, 50); 
    if (data.photo) {
        doc.addImage(data.photo, 'JPEG', 150, 50, 40, 50);
    } else {
        doc.text("PHOTO", 170, 75, null, null, "center");
    }

    // --- PERSONAL DETAILS ---
    let y = 60;
    const lineHeight = 9;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Personal Details", 14, 50);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Full Name:  ${data.name}`, 14, y); y += lineHeight;
    doc.text(`Father's Name:  ${data.fathersName}`, 14, y); y += lineHeight;
    doc.text(`Aadhar Number:  ${data.aadharNo}`, 14, y); y += lineHeight; // <--- Printed Here
    doc.text(`Address:  ${data.address}`, 14, y); y += lineHeight;
    doc.text(`Mobile:  ${data.mobile}`, 14, y); y += lineHeight;
    doc.text(`Emergency Contact:  ${data.emergencyContact}`, 14, y); y += lineHeight;

    // --- LIBRARY DETAILS ---
    y += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Membership Details", 14, y);
    y += 15;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Seat Type:  ${data.seatType}`, 14, y);
    doc.text(`Assigned Seat:  ${data.seatType === 'Reserved' ? (data.seat_no || 'Pending') : 'General Access'}`, 100, y);
    y += lineHeight;

    doc.text(`Time Slot:  ${data.startTime} to ${data.endTime}`, 14, y);
    doc.text(`Monthly Fee:  Rs. ${data.monthlyFee}/-`, 100, y);
    y += lineHeight;

    // --- ID CARD PROOF ---
    y += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("ID Proof (Aadhar Copy)", 14, y);
    y += 10;
    
    if (data.aadhar) {
        doc.addImage(data.aadhar, 'JPEG', 14, y, 80, 50);
    } else {
        doc.rect(14, y, 80, 50);
        doc.text("No ID Attached", 54, y + 25, null, null, "center");
    }

    // --- FOOTER ---
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("I agree to abide by all library rules and regulations.", 14, pageHeight - 50);
    doc.line(14, pageHeight - 30, 70, pageHeight - 30);
    doc.text("Student Signature", 14, pageHeight - 25);
    doc.line(140, pageHeight - 30, 196, pageHeight - 30);
    doc.text("Authorized Signatory", 140, pageHeight - 25);

    doc.save(`${data.name}_Admission_Form.pdf`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.seatType === 'Reserved' && !formData.roomId) return alert("Please select a Room for reserved seat.");

    try {
      await db.students.add({ 
        ...formData, 
        roomId: formData.roomId ? parseInt(formData.roomId) : null,
        seat_no: (formData.seatType === 'Reserved' && formData.seat_no) ? parseInt(formData.seat_no) : null,
        monthlyFee: parseFloat(formData.monthlyFee) || 0,
        status: 'Active', 
        admissionDate: new Date() 
      });
      
      if(confirm("Admission Successful! Download Form?")) {
        generateAdmissionPDF(formData);
      }
      navigate('/students');
    } catch (error) {
      alert("Error: " + error);
    }
  };

  return (
    <div className="p-4 pb-24 min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 text-gray-800">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 rounded-full"><ArrowLeft size={20}/></button>
        <h1 className="text-xl font-bold">New Admission</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
        
        {/* 1. PHOTO & AADHAR ROW */}
        <div className="flex justify-center gap-6">
            {/* Student Photo */}
            <label className="relative cursor-pointer group flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <Camera className="text-gray-400" size={24} />}
                </div>
                <input type="file" accept="image/*" onChange={(e) => handleFile(e, 'photo')} className="hidden" />
                <span className="text-[10px] font-bold text-blue-600 mt-1">Add Photo</span>
            </label>

            {/* Aadhar Upload */}
            <label className="relative cursor-pointer group flex flex-col items-center">
                <div className="w-24 h-24 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {formData.aadhar ? <img src={formData.aadhar} className="w-full h-full object-cover" /> : <FileText className="text-gray-400" size={24} />}
                </div>
                <input type="file" accept="image/*" onChange={(e) => handleFile(e, 'aadhar')} className="hidden" />
                <span className="text-[10px] font-bold text-blue-600 mt-1">Upload ID</span>
            </label>
        </div>

        {/* 2. PERSONAL DETAILS */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><User size={12}/> Personal Info</h3>
          
          <input required name="name" placeholder="Full Name" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 outline-none transition-all" />
          <input name="fathersName" placeholder="Father's Name" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 outline-none transition-all" />
          
          <div className="relative">
             <CreditCard size={16} className="absolute left-3 top-3.5 text-gray-400"/>
             <input type="text" name="aadharNo" placeholder="Aadhar Number" onChange={handleChange} className="w-full pl-9 p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 outline-none transition-all" />
          </div>

          <div className="relative">
             <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400"/>
             <input name="address" placeholder="Residential Address" onChange={handleChange} className="w-full pl-9 p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 outline-none transition-all" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
             <div className="relative">
                <Phone size={16} className="absolute left-3 top-3.5 text-gray-400"/>
                <input required type="tel" name="mobile" placeholder="Mobile" onChange={handleChange} className="w-full pl-9 p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none" />
             </div>
             <input type="tel" name="emergencyContact" placeholder="Emergency No" onChange={handleChange} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 outline-none" />
          </div>
        </div>

        {/* 3. LIBRARY LOGIC (Fee & Time) */}
        <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Clock size={12}/> Shift & Fees</h3>
            
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-2 rounded-xl border border-gray-200">
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">Start Time</label>
                    <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full bg-transparent font-bold outline-none" />
                </div>
                <div className="bg-gray-50 p-2 rounded-xl border border-gray-200">
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">End Time</label>
                    <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full bg-transparent font-bold outline-none" />
                </div>
            </div>

            <div className="relative">
                <IndianRupee size={16} className="absolute left-3 top-3.5 text-gray-400"/>
                <input type="number" name="monthlyFee" placeholder="Monthly Fee Amount (e.g. 800)" onChange={handleChange} className="w-full pl-9 p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-gray-700 outline-none" />
            </div>
        </div>

        {/* 4. SEAT TYPE TOGGLE */}
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2 text-blue-800 font-bold">
                <Armchair size={18}/> <span>Seat Allocation</span>
             </div>
             
             {/* Toggle Switch */}
             <div className="flex bg-white rounded-lg p-1 border border-blue-100">
                <button type="button" onClick={() => setFormData({...formData, seatType: 'Reserved'})} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${formData.seatType === 'Reserved' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Reserved</button>
                <button type="button" onClick={() => setFormData({...formData, seatType: 'General'})} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${formData.seatType === 'General' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>General</button>
             </div>
          </div>
          
          {/* Show Seat Selectors ONLY if Reserved */}
          {formData.seatType === 'Reserved' ? (
              <div className="space-y-3 animate-fade-in">
                <select name="roomId" onChange={handleChange} className="w-full p-3 bg-white rounded-xl border border-blue-200 text-gray-700 font-medium focus:outline-none" required>
                    <option value="">Select Room / Zone</option>
                    {rooms?.map(r => <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</option>)}
                </select>
                <input type="number" name="seat_no" placeholder="Seat Number" onChange={handleChange} className="w-full p-3 bg-white rounded-xl border border-blue-200 text-center font-bold focus:outline-none" />
              </div>
          ) : (
              <p className="text-xs text-blue-600/70 italic text-center py-2">Student can sit in any available seat.</p>
          )}
        </div>

        <button type="submit" className="w-full bg-black text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2">
          <Save size={20} /> Submit & Print
        </button>

      </form>
    </div>
  );
};

export default Admission;