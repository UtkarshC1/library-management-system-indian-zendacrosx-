import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  ArrowLeft, User, Phone, Save, Trash2, Calendar, 
  IndianRupee, Edit2, X, MessageCircle, CreditCard, Camera, FileText, Sparkles, MapPin, Smartphone,
  Plus, Clock, LogIn, LogOut, ChevronRight, Zap, ShieldCheck, Download
} from 'lucide-react';
import { compressImage } from '../utils/imageCompression';

import { generateIDCard, generateAdmissionForm } from '../utils/pdfGenerator';

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const studentId = parseInt(id);

  const student = useLiveQuery(() => db.students.get(studentId), [studentId]);
  const transactions = useLiveQuery(() => db.finance.where('studentId').equals(studentId).reverse().toArray(), [studentId]);
  const attendance = useLiveQuery(() => db.attendance.where('studentId').equals(studentId).reverse().toArray(), [studentId]);
  const rooms = useLiveQuery(() => db.rooms.toArray());
  const settings = useLiveQuery(() => db.settings.toArray());

  const [tab, setTab] = useState('Profile'); 
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  if (!student) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
       <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] animate-pulse">Loading Profile...</p>
    </div>
  );

  const getValue = (key) => settings?.find(s => s.key === key)?.value || '';

  const handleSave = async () => {
    await db.students.update(studentId, {
        ...formData,
        roomId: formData.roomId ? parseInt(formData.roomId) : null,
        seat_no: formData.seat_no ? parseInt(formData.seat_no) : null,
        monthlyFee: parseFloat(formData.monthlyFee) || 0
    });
    setEditMode(false);
  };

  const handlePayFee = async () => {
    const amount = prompt("Confirm Payment Amount (₹):", student.monthlyFee);
    if (amount) {
      await db.finance.add({
        type: 'Income', category: 'Fee', amount: parseFloat(amount),
        description: `Fee: ${student.name}`, studentId: studentId, date: new Date()
      });
      alert("✓ Transaction Encrypted & Saved");
    }
  };

  const currentRoomName = rooms?.find(r => r.id === student.roomId)?.name || 'N/A';

  const downloadIDCard = async () => {
    await generateIDCard(student, getValue('libraryName') || 'Library', getValue('libraryAddress') || 'City Center');
  };

  const downloadAdmissionForm = async () => {
    await generateAdmissionForm(student, getValue('libraryName') || 'Library', getValue('libraryAddress') || 'City Center');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 space-y-12 animate-reveal relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50 blur-[150px] -z-10 rounded-full"></div>
      
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-8">
        <div className="flex items-center gap-4 md:gap-6">
           <button onClick={() => navigate(-1)} className="p-3 md:p-4 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-blue-600 transition-all shadow-sm active:scale-90 group">
              <ArrowLeft size={20} className="md:w-6 md:h-6 group-hover:-translate-x-1 transition-transform" />
           </button>
           <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Profile Active</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-extrabold text-slate-900 tracking-tight leading-none mb-1">Student Profile</h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">Student ID: #{student.id.toString().padStart(4, '0')}</p>
           </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
           <button onClick={editMode ? handleSave : () => { setFormData(student); setEditMode(true); }} className={`btn-luxury ${editMode ? 'btn-luxury-primary bg-emerald-600 hover:bg-emerald-700 shadow-sm' : 'btn-luxury-secondary'} flex-1 md:flex-none px-8`}>
              {editMode ? <><Save size={20}/> Save Changes</> : <><Edit2 size={20}/> Edit Profile</>}
           </button>
           {editMode && (
             <button onClick={() => setEditMode(false)} className="btn-luxury btn-luxury-secondary px-8 border-rose-200 text-rose-600 hover:bg-rose-50">
                <X size={20}/>
             </button>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
         
         {/* Identity Hub */}
         <div className="lg:col-span-4 space-y-8">
            <div className="luxury-card p-10 flex flex-col items-center text-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-blue-50 to-indigo-50"></div>
               
               <div className="w-40 h-40 rounded-[3rem] bg-white border-8 border-white shadow-md overflow-hidden mb-8 relative z-10 group cursor-pointer">
                  {student.photo ? <img src={student.photo} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /> : <User size={64} className="m-auto mt-10 text-slate-400"/>}
                  <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <Camera size={32} className="text-white"/>
                  </div>
               </div>

               <h2 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight leading-none mb-2 z-10">{student.name}</h2>
               <div className="flex items-center justify-center gap-2 text-blue-600 font-bold text-sm tracking-widest uppercase z-10">
                  <Zap size={14} fill="currentColor"/> {student.status}
               </div>

               <div className="grid grid-cols-2 gap-4 w-full mt-12 relative z-10">
                  <a href={`tel:${student.mobile}`} className="luxury-card p-4 flex flex-col items-center gap-2 bg-slate-50 border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group shadow-none">
                     <Phone size={20} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
                     <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-700 uppercase tracking-widest">Call</span>
                  </a>
                  <button className="luxury-card p-4 flex flex-col items-center gap-2 bg-slate-50 border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all group shadow-none">
                     <MessageCircle size={20} className="text-slate-500 group-hover:text-emerald-600 transition-colors" />
                     <span className="text-[10px] font-bold text-slate-500 group-hover:text-emerald-700 uppercase tracking-widest">Message</span>
                  </button>
               </div>

               <div className="w-full mt-8 p-6 bg-blue-50 rounded-3xl border border-blue-100 text-left relative z-10">
                  <div className="flex justify-between items-center mb-4">
                     <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Fee Plan</span>
                     <div className="px-2 py-0.5 bg-blue-200 text-blue-700 text-[8px] font-bold rounded">ACTIVE</div>
                  </div>
                  <div className="flex items-center justify-between">
                     <p className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">₹{student.monthlyFee}<span className="text-slate-500 font-medium text-xs ml-1">/ mo</span></p>
                     <button onClick={handlePayFee} className="p-3 bg-blue-600 text-white rounded-xl shadow-md hover:scale-110 transition-transform active:scale-95"><CreditCard size={18}/></button>
                  </div>
               </div>
            </div>

            <div className="luxury-card p-8 space-y-6">
               <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] px-2">Exports & Tools</h3>
               <div className="space-y-3">
                  <button onClick={downloadIDCard} className="w-full luxury-card shadow-none p-5 flex items-center justify-between bg-slate-50 border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group">
                     <div className="flex items-center gap-4 text-slate-500 group-hover:text-blue-600 transition-colors">
                        <CreditCard size={20}/>
                        <span className="text-xs font-bold uppercase tracking-widest">Download ID Card</span>
                     </div>
                     <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600" />
                  </button>
                  <button onClick={downloadAdmissionForm} className="w-full luxury-card shadow-none p-5 flex items-center justify-between bg-slate-50 border-slate-100 hover:bg-blue-50 hover:border-blue-200 transition-all group">
                     <div className="flex items-center gap-4 text-slate-500 group-hover:text-blue-600 transition-colors">
                        <FileText size={20}/>
                        <span className="text-xs font-bold uppercase tracking-widest">Admission Form</span>
                     </div>
                     <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600" />
                  </button>
                  <button 
                     onClick={async () => { 
                        if(confirm(`Are you sure you want to ${student.status === 'Active' ? 'deactivate' : 'activate'} this student?`)) { 
                           await db.students.update(studentId, { status: student.status === 'Active' ? 'Inactive' : 'Active' });
                        } 
                     }} 
                     className={`w-full luxury-card shadow-none p-5 flex items-center justify-between transition-all group ${student.status === 'Active' ? 'bg-rose-50 border-rose-100 hover:bg-rose-100' : 'bg-emerald-50 border-emerald-100 hover:bg-emerald-100'}`}
                  >
                     <div className={`flex items-center gap-4 ${student.status === 'Active' ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {student.status === 'Active' ? <X size={20}/> : <ShieldCheck size={20}/>}
                        <span className="text-xs font-bold uppercase tracking-widest">
                           {student.status === 'Active' ? 'Deactivate Student' : 'Activate Student'}
                        </span>
                     </div>
                     <ChevronRight size={18} className={student.status === 'Active' ? 'text-rose-400' : 'text-emerald-400'} />
                  </button>
               </div>
            </div>
         </div>

         {/* Navigation & Data Terminal */}
         <div className="lg:col-span-8 space-y-8">
            <div className="flex bg-slate-50 p-1 rounded-3xl border border-slate-200 w-fit shadow-sm max-w-full overflow-x-auto no-scrollbar">
               {['Profile', 'Finance', 'Attendance'].map(t => (
                 <button key={t} onClick={() => setTab(t)} className={`px-6 md:px-10 py-3 md:py-4 rounded-[1.25rem] text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-500 flex-shrink-0 ${tab === t ? 'bg-blue-600 text-white shadow-md scale-105 z-10' : 'text-slate-500 hover:text-slate-900'}`}>
                    {t}
                 </button>
               ))}
            </div>

            <div className="luxury-card p-6 md:p-12 min-h-[400px] md:min-h-[600px] border-slate-200 relative">
               <div className="absolute top-0 left-6 md:left-12 right-6 md:right-12 h-px bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"></div>
               
               {/* Identity View */}
               {tab === 'Profile' && (
                 <div className="space-y-12 animate-reveal">
                    {editMode ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="md:col-span-2 space-y-3">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Full Name</label>
                             <input value={formData.name || ''} onChange={e=>setFormData({...formData, name:e.target.value})} className="input-luxury text-xl font-bold h-16" />
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Mobile Number</label>
                             <input value={formData.mobile || ''} onChange={e=>setFormData({...formData, mobile:e.target.value})} className="input-luxury font-bold h-16 tracking-widest" />
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Father's Name</label>
                             <input value={formData.fathersName || ''} onChange={e=>setFormData({...formData, fathersName:e.target.value})} className="input-luxury font-bold h-16" />
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Aadhar Number</label>
                             <input value={formData.aadharNo || ''} onChange={e=>setFormData({...formData, aadharNo:e.target.value})} className="input-luxury font-bold h-16 tracking-[0.2em]" />
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Emergency Contact</label>
                             <input value={formData.emergencyContact || ''} onChange={e=>setFormData({...formData, emergencyContact:e.target.value})} className="input-luxury font-bold h-16" />
                          </div>
                          <div className="md:col-span-2 space-y-3">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Address</label>
                             <input value={formData.address || ''} onChange={e=>setFormData({...formData, address:e.target.value})} className="input-luxury h-16" />
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Monthly Fee (₹)</label>
                             <input type="number" value={formData.monthlyFee || ''} onChange={e=>setFormData({...formData, monthlyFee:e.target.value})} className="input-luxury font-bold h-16 text-blue-600" />
                          </div>
                          <div className="space-y-3">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Status</label>
                             <select value={formData.status || 'Active'} onChange={e=>setFormData({...formData, status:e.target.value})} className="input-luxury font-bold h-16">
                                <option className="bg-white">Active</option>
                                <option className="bg-white">Inactive</option>
                             </select>
                          </div>
                          <div className="md:col-span-2 space-y-3">
                             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Shift & Seat Allocation</label>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <select value={formData.shift || 'Full Day'} onChange={e=>setFormData({...formData, shift:e.target.value})} className="input-luxury font-bold">
                                   <option className="bg-white">Full Day</option>
                                   <option className="bg-white">Morning</option>
                                   <option className="bg-white">Evening</option>
                                </select>
                                <input value={formData.startTime} onChange={e=>setFormData({...formData, startTime:e.target.value})} className="input-luxury font-bold text-center" placeholder="Start" />
                                <input value={formData.endTime} onChange={e=>setFormData({...formData, endTime:e.target.value})} className="input-luxury font-bold text-center" placeholder="End" />
                                <select value={formData.roomId || ''} onChange={e=>setFormData({...formData, roomId:e.target.value})} className="input-luxury font-bold">
                                   <option value="" className="bg-white">Room</option>
                                   {rooms?.map(r => <option key={r.id} value={r.id} className="bg-white">{r.name}</option>)}
                                </select>
                             </div>
                             <div className="mt-4">
                                <input type="number" placeholder="Seat Number" value={formData.seat_no || ''} onChange={e=>setFormData({...formData, seat_no:e.target.value})} className="input-luxury font-bold text-center h-16" />
                             </div>
                          </div>
                       </div>
                    ) : (
                      <div className="space-y-16">
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                            <div className="space-y-2">
                               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em]">Room</p>
                               <p className="text-xl font-display font-extrabold text-slate-900 tracking-tight">{currentRoomName}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned</p>
                            </div>
                            <div className="space-y-2">
                               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em]">Seat</p>
                               <p className="text-xl font-display font-extrabold text-slate-900 tracking-tight">#{student.seat_no || 'TBA'}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase">Number</p>
                            </div>
                            <div className="space-y-2">
                               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em]">Shift</p>
                               <p className="text-xl font-display font-extrabold text-slate-900 tracking-tight">{student.shift}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase">Timing</p>
                            </div>
                            <div className="space-y-2">
                               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em]">Status</p>
                               <p className="text-xl font-display font-extrabold text-emerald-600 tracking-tight">ACTIVE</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase">Current</p>
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-16 pt-12 border-t border-slate-100">
                            <div className="space-y-8">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600"><ShieldCheck size={20}/></div>
                                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Personal Details</h4>
                               </div>
                               <div className="space-y-6 px-1">
                                  <div>
                                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Father's Name</p>
                                     <p className="text-lg font-bold text-slate-700">{student.fathersName || 'No Data'}</p>
                                  </div>
                                  <div>
                                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Aadhar Number</p>
                                     <p className="text-lg font-bold text-slate-700 tracking-[0.2em]">{student.aadharNo || 'UNVERIFIED'}</p>
                                  </div>
                                  <div>
                                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Emergency Contact</p>
                                     <p className="text-lg font-bold text-slate-700">{student.emergencyContact || 'Not Provided'}</p>
                                  </div>
                                  <div>
                                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Admission Date</p>
                                     <p className="text-lg font-bold text-slate-700">{new Date(student.admissionDate).toLocaleDateString('en-IN', {day:'2-digit', month:'long', year:'numeric'})}</p>
                                  </div>
                               </div>
                            </div>
                            <div className="space-y-8">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600"><MapPin size={20}/></div>
                                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Address & Membership</h4>
                               </div>
                               <div className="space-y-6 px-1">
                                  <div>
                                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Current Address</p>
                                     <p className="text-lg font-medium text-slate-700 leading-relaxed max-w-sm">{student.address || 'Address information missing.'}</p>
                                  </div>
                                  <div>
                                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Membership Type</p>
                                     <p className="text-lg font-bold text-blue-600 uppercase tracking-widest">{student.seatType}</p>
                                  </div>
                               </div>
                            </div>
                         </div>

                         {student.aadhar && (
                           <div className="pt-12 border-t border-slate-100 space-y-8">
                              <div className="flex justify-between items-center px-1">
                                 <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Aadhar Document</h4>
                              </div>
                              <div className="luxury-card p-4 rounded-[3rem] bg-slate-100 shadow-sm group relative overflow-hidden">
                                 <img src={student.aadhar} className="w-full h-[500px] object-contain rounded-[2rem] transition-all duration-700 group-hover:scale-[1.02]" />
                              </div>
                           </div>
                         )}
                      </div>
                    )}
                 </div>
               )}

               {/* Treasury View */}
               {tab === 'Finance' && (
                 <div className="space-y-12 animate-reveal">
                    <div className="flex justify-between items-end mb-8 px-2">
                       <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em] mb-2">Financial History</p>
                          <h3 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">Transactions</h3>
                       </div>
                       <button onClick={handlePayFee} className="btn-luxury btn-luxury-primary px-8">
                          <Plus size={20}/> Add Payment
                       </button>
                    </div>

                    <div className="space-y-4">
                        {transactions?.length > 0 ? (
                           transactions.map(t => (
                             <div key={t.id} className="luxury-card shadow-none p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-50 border-slate-100 hover:border-blue-200 transition-all group gap-4 md:gap-0">
                                <div className="flex items-center gap-4 md:gap-6">
                                   <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                                      <IndianRupee size={20} className="md:w-6 md:h-6" strokeWidth={2.5}/>
                                   </div>
                                   <div>
                                      <p className="text-base md:text-lg font-bold text-slate-900 tracking-tight leading-none mb-1.5">{t.description}</p>
                                      <div className="flex items-center gap-3 text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                         <Calendar size={10} className="md:w-3 md:h-3"/> {new Date(t.date).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}
                                         <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                         <Clock size={10} className="md:w-3 md:h-3"/> {new Date(t.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                      </div>
                                   </div>
                                </div>
                                <div className="text-right w-full md:w-auto">
                                   <p className="text-2xl md:text-3xl font-display font-extrabold text-slate-900 tracking-tight group-hover:text-emerald-600 transition-colors">₹{t.amount}</p>
                                   <p className="text-[7px] md:text-[8px] font-bold text-emerald-600 uppercase tracking-[0.3em] mt-1">Paid</p>
                                </div>
                             </div>
                           ))
                        ) : (
                          <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                             <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-300">
                                <IndianRupee size={32}/>
                             </div>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No transaction history found</p>
                          </div>
                        )}
                     </div>
                 </div>
               )}

               {/* Logs View */}
               {tab === 'Attendance' && (
                 <div className="space-y-12 animate-reveal">
                    <div className="flex justify-between items-end mb-8 px-2">
                       <div>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em] mb-2">Attendance History</p>
                          <h3 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">Logs</h3>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                       {attendance?.map(log => (
                          <div key={log.id} className="luxury-card shadow-none p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-50 border-slate-100 hover:border-blue-200 transition-all gap-4 md:gap-0">
                             <div className="flex items-center gap-4 md:gap-8">
                                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] flex items-center justify-center shadow-sm border ${log.status === 'In' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-500 border-slate-200'}`}>
                                   {log.status === 'In' ? <LogIn size={20} className="md:w-7 md:h-7" strokeWidth={2.5}/> : <LogOut size={20} className="md:w-7 md:h-7" strokeWidth={2.5}/>}
                                </div>
                                <div>
                                   <p className="text-lg md:text-xl font-display font-extrabold text-slate-900 tracking-tight mb-1 md:mb-2">{new Date(log.date).toLocaleDateString('en-IN', {weekday: 'long', day:'2-digit', month:'long'})}</p>
                                   <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
                                      <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                         <Clock size={10} className="text-blue-500 md:w-3 md:h-3"/> IN: <span className="text-slate-900 ml-1">{log.inTime ? new Date(log.inTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'NOT LOGGED'}</span>
                                      </div>
                                      <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                         <Clock size={10} className="text-orange-500 md:w-3 md:h-3"/> OUT: <span className="text-slate-900 ml-1">{log.outTime ? new Date(log.outTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'IN PROGRESS'}</span>
                                      </div>
                                   </div>
                                </div>
                             </div>
                             <div className={`px-4 md:px-6 py-2 md:py-2.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] border shadow-sm self-end md:self-auto ${log.status === 'In' ? 'bg-blue-600 text-white border-blue-500 animate-pulse' : 'bg-white text-slate-600 border-slate-200'}`}>
                                {log.status === 'In' ? 'Present' : 'Left'}
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default StudentProfile;