import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useNavigate } from 'react-router-dom';
import { Camera, Save, ArrowLeft, Armchair, FileText, User, MapPin, Phone, Clock, IndianRupee, CreditCard, Sparkles, Plus, X, ShieldCheck, Zap } from 'lucide-react';
import { generateAdmissionForm } from '../utils/pdfGenerator';
import { compressImage } from '../utils/imageCompression';

const Admission = () => {
  const navigate = useNavigate();
  const rooms = useLiveQuery(() => db.rooms.toArray());
  const settings = useLiveQuery(() => db.settings.toArray());
  
  const [formData, setFormData] = useState({
    name: '', mobile: '', fathersName: '', address: '', aadharNo: '',
    roomId: '', seat_no: '', seatType: 'Reserved', shift: 'Full Day',
    startTime: '08:00', endTime: '20:00', monthlyFee: 500, emergencyContact: '',
    status: 'Active', admissionDate: new Date().toISOString(),
    photo: null, aadhar: null
  });

  const getValue = (key) => settings?.find(s => s.key === key)?.value || '';

  const handleFile = async (e, field) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 800, 0.7);
        setFormData(prev => ({ ...prev, [field]: compressedBase64 }));
      } catch (err) { alert("Error processing image."); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.seatType === 'Reserved' && formData.roomId && formData.seat_no) {
       const conflict = await db.students.where({ roomId: parseInt(formData.roomId), seat_no: parseInt(formData.seat_no) }).first();
       if (conflict) return alert(`Terminal Conflict: Station ${formData.seat_no} is currently occupied.`);
    }

    try {
      const newId = await db.students.add({
        ...formData,
        roomId: formData.roomId ? parseInt(formData.roomId) : null,
        seat_no: formData.seat_no ? parseInt(formData.seat_no) : null,
        monthlyFee: parseFloat(formData.monthlyFee) || 0
      });

      if (confirm("Admission Successful! Download Registration Form?")) {
        generateAdmissionForm(
          { ...formData, id: newId },
          getValue('libraryName') || 'Library System',
          getValue('libraryAddress') || 'City Center'
        );
      }
      navigate('/students');
    } catch (err) { alert("Core Database Error: Save Failed."); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 space-y-12 animate-reveal relative">
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-50 blur-[150px] -z-10 rounded-full"></div>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-slate-200 pb-12">
        <div className="flex items-center gap-6">
           <button onClick={() => navigate(-1)} className="p-3 md:p-4 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-blue-600 transition-all shadow-sm active:scale-90 group">
              <ArrowLeft size={20} className="md:w-6 md:h-6 group-hover:-translate-x-1 transition-transform" />
           </button>
           <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">New Student Admission</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-extrabold text-slate-900 tracking-tight leading-none mb-1">Admission</h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">Student Registration Form</p>
           </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
         
         {/* Configuration Sidebar */}
         <div className="lg:col-span-4 space-y-8">
            <div className="luxury-card p-10 flex flex-col items-center shadow-sm">
               <label className={`w-40 h-40 rounded-[3rem] bg-white border-8 border-white shadow-md overflow-hidden flex items-center justify-center group relative cursor-pointer mb-8 transition-transform hover:scale-105 duration-500 ${!formData.photo ? 'animate-pulse hover:animate-none' : ''}`}>
                  {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : <Camera size={48} className="text-slate-300 group-hover:text-blue-500 transition-colors" />}
                  <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="text-[10px] font-bold text-white uppercase tracking-widest">Upload Photo</span>
                  </div>
                  <input type="file" accept="image/*" onChange={(e) => handleFile(e, 'photo')} className="hidden" />
               </label>
               
               <div className="w-full p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-2xl"></div>
                  <p className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.4em] mb-3">Monthly Fee</p>
                  <p className="text-4xl font-display font-extrabold text-blue-900 tracking-tight flex justify-center items-center">
                     ₹<input type="number" value={formData.monthlyFee} onChange={e=>setFormData({...formData, monthlyFee: e.target.value})} className="bg-transparent w-24 outline-none text-center border-b border-blue-200 focus:border-blue-500 transition-colors mx-1" />
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                     <Zap size={12} className="text-blue-500"/> Active Subscription
                  </div>
               </div>
            </div>

            <div className="luxury-card p-8 space-y-8 shadow-none border-slate-200">
               <div className="flex items-center gap-3 px-2">
                  <Armchair size={18} className="text-blue-500"/>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Seat Allocation</h3>
               </div>
               <div className="space-y-6">
                  <div className="space-y-3">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Seat Type</label>
                     <select value={formData.seatType} onChange={e=>setFormData({...formData, seatType:e.target.value})} className="input-luxury font-bold">
                        <option className="bg-white">Reserved</option>
                        <option className="bg-white">Unreserved</option>
                     </select>
                  </div>
                  {formData.seatType === 'Reserved' && (
                    <div className="grid grid-cols-2 gap-4 animate-reveal">
                       <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Room</label>
                          <select required value={formData.roomId} onChange={e=>setFormData({...formData, roomId:e.target.value})} className="input-luxury text-sm font-bold">
                             <option value="" className="bg-white">Select</option>
                             {rooms?.map(r => <option key={r.id} value={r.id} className="bg-white">{r.name}</option>)}
                          </select>
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Seat Number</label>
                          <input required type="number" placeholder="No." value={formData.seat_no} onChange={e=>setFormData({...formData, seat_no:e.target.value})} className="input-luxury text-sm font-bold text-center" />
                       </div>
                    </div>
                  )}
               </div>
            </div>
         </div>

         {/* Main Data Terminal */}
         <div className="lg:col-span-8 space-y-8">
            <div className="luxury-card p-6 md:p-12 space-y-12 md:space-y-16 border-slate-200 relative shadow-sm">
               <div className="absolute top-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"></div>
               
               {/* Identity & Contact */}
               <div className="space-y-10">
                  <div className="flex items-center gap-5">
                     <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><User size={24} strokeWidth={2.5}/></div>
                     <div>
                        <h3 className="text-xl font-display font-extrabold text-slate-900 tracking-tight leading-none mb-1">Personal Details</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Basic Information</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="md:col-span-2 space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Full Name</label>
                        <input required placeholder="Rahul Sharma" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} className="input-luxury font-bold text-lg h-16" />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Mobile Number</label>
                        <input required placeholder="10-digit mobile" value={formData.mobile} onChange={e=>setFormData({...formData, mobile:e.target.value})} className="input-luxury font-bold h-16 tracking-widest" />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Father's Name</label>
                        <input placeholder="Father's Name" value={formData.fathersName} onChange={e=>setFormData({...formData, fathersName:e.target.value})} className="input-luxury font-bold h-16" />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Emergency Contact</label>
                        <input placeholder="Emergency No." value={formData.emergencyContact} onChange={e=>setFormData({...formData, emergencyContact:e.target.value})} className="input-luxury font-bold h-16" />
                     </div>
                     <div className="md:col-span-2 space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Address</label>
                        <input placeholder="Current Residential Address" value={formData.address} onChange={e=>setFormData({...formData, address:e.target.value})} className="input-luxury h-16" />
                     </div>
                  </div>
               </div>

               {/* Shift & Windows */}
               <div className="space-y-10 pt-16 border-t border-slate-100">
                  <div className="flex items-center gap-5">
                     <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><Clock size={24} strokeWidth={2.5}/></div>
                     <div>
                        <h3 className="text-xl font-display font-extrabold text-slate-900 tracking-tight leading-none mb-1">Shift Timings</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Schedule Details</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Shift</label>
                        <select value={formData.shift} onChange={e=>setFormData({...formData, shift:e.target.value})} className="input-luxury font-bold h-16">
                           <option className="bg-white">Full Day</option>
                           <option className="bg-white">Morning</option>
                           <option className="bg-white">Evening</option>
                        </select>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Start Time</label>
                        <input type="time" value={formData.startTime} onChange={e=>setFormData({...formData, startTime:e.target.value})} className="input-luxury font-bold h-16 text-center" />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">End Time</label>
                        <input type="time" value={formData.endTime} onChange={e=>setFormData({...formData, endTime:e.target.value})} className="input-luxury font-bold h-16 text-center" />
                     </div>
                  </div>
               </div>

               {/* Verification Proofs */}
               <div className="space-y-10 pt-16 border-t border-slate-100">
                  <div className="flex items-center gap-5">
                     <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><ShieldCheck size={24} strokeWidth={2.5}/></div>
                     <div>
                        <h3 className="text-xl font-display font-extrabold text-slate-900 tracking-tight leading-none mb-1">Documents</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Aadhar Information</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Aadhar Number</label>
                        <input placeholder="12-digit Secure ID" value={formData.aadharNo} onChange={e=>setFormData({...formData, aadharNo:e.target.value})} className="input-luxury font-bold h-16 tracking-[0.3em]" />
                     </div>
                     <div className="md:col-span-2 space-y-4">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Aadhar Document Upload</label>
                        <label className="w-full h-56 rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center group cursor-pointer relative overflow-hidden transition-all hover:bg-slate-100 hover:border-blue-300">
                           {formData.aadhar ? <img src={formData.aadhar} className="h-full w-full object-contain p-4" /> : (
                             <div className="flex flex-col items-center gap-4 text-slate-500 group-hover:text-blue-600 transition-all">
                                <div className="p-5 bg-white rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                   <Plus size={32} strokeWidth={2.5}/>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Select Document Image</span>
                             </div>
                           )}
                           <input type="file" accept="image/*" onChange={(e) => handleFile(e, 'aadhar')} className="hidden" />
                        </label>
                     </div>
                  </div>
               </div>

               {/* Submission Terminals */}
               <div className="pt-16 flex gap-6">
                  <button type="button" onClick={() => navigate(-1)} className="btn-luxury btn-luxury-secondary flex-1 py-5">Cancel</button>
                  <button type="submit" className="btn-luxury btn-luxury-primary flex-[2] py-5">
                     <Save size={20}/> Submit Admission
                  </button>
               </div>
            </div>
         </div>
      </form>
    </div>
  );
};

export default Admission;