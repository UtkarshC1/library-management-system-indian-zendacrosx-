import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  ArrowLeft, User, Phone, Save, Trash2, Calendar, 
  IndianRupee, Edit2, X, MessageCircle, CreditCard 
} from 'lucide-react';

const StudentProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const studentId = parseInt(id);

  // 1. Fetch Live Data
  const student = useLiveQuery(() => db.students.get(studentId), [studentId]);
  const transactions = useLiveQuery(() => db.finance.where('studentId').equals(studentId).reverse().toArray(), [studentId]);
  const attendance = useLiveQuery(() => db.attendance.where('studentId').equals(studentId).reverse().toArray(), [studentId]);
  const rooms = useLiveQuery(() => db.rooms.toArray());

  // 2. UI State
  const [tab, setTab] = useState('Info'); 
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});

  if (!student) return <div className="min-h-screen flex items-center justify-center text-gray-400 font-bold">Loading Profile...</div>;

  // --- ACTIONS ---
  
  const startEditing = () => {
    setFormData(student); 
    setEditMode(true);
  };

  const handleSave = async () => {
    await db.students.update(studentId, {
        ...formData,
        roomId: formData.roomId ? parseInt(formData.roomId) : null,
        seat_no: formData.seat_no ? parseInt(formData.seat_no) : null,
        monthlyFee: parseFloat(formData.monthlyFee) || 0
    });
    setEditMode(false);
  };

  const handleDelete = async () => {
    if (confirm("Permanently delete this student? This cannot be undone.")) {
      await db.students.delete(studentId);
      await db.finance.where('studentId').equals(studentId).delete();
      await db.attendance.where('studentId').equals(studentId).delete();
      navigate('/students');
    }
  };

  const handlePayFee = async () => {
    const amount = prompt("Enter Fee Amount (₹):", student.monthlyFee || "500");
    if (amount) {
      await db.finance.add({
        type: 'Income',
        category: 'Fee',
        amount: parseFloat(amount),
        description: `Fee: ${student.name}`,
        studentId: studentId,
        date: new Date()
      });
      alert("Payment Recorded!");
    }
  };

  const sendWhatsapp = () => {
    const msg = `Hello ${student.name}, this is a message from the Library.`;
    window.open(`https://wa.me/91${student.mobile}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Helper
  const currentRoomName = rooms?.find(r => r.id === student.roomId)?.name || 'Unknown Room';

  return (
    <div className="min-h-screen bg-gray-50 pb-24 animate-fade-in">

      {/* HEADER */}
      <div className="bg-white p-4 sticky top-0 z-10 border-b border-gray-100 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><ArrowLeft size={20}/></button>
        <span className="font-bold text-lg text-gray-800">Student Profile</span>
      </div>

      {/* HERO CARD */}
      <div className="bg-white m-4 p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
        {/* Decorative Background Blur */}
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-50 to-white"></div>

        <div className="w-28 h-28 bg-white rounded-full mb-3 overflow-hidden border-4 border-white shadow-lg relative z-10">
           {student.photo ? <img src={student.photo} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300"><User size={40}/></div>}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 relative z-10">{student.name}</h1>
        <p className="text-gray-500 font-medium text-sm mb-1">{student.mobile}</p>
        
        <div className="flex items-center gap-2 mt-1">
           <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md uppercase tracking-wide">
             {student.shift || 'Full Day'}
           </span>
           <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
             {student.seatType === 'Reserved' ? `${currentRoomName} • S-${student.seat_no}` : 'General'}
           </span>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-3 mt-6 w-full relative z-10">
          <a href={`tel:${student.mobile}`} className="flex-1 bg-white border border-green-200 text-green-700 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform">
            <Phone size={18}/> Call
          </a>
          <button onClick={sendWhatsapp} className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-transform">
            <MessageCircle size={18}/> Chat
          </button>
          <button onClick={editMode ? () => setEditMode(false) : startEditing} className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform ${editMode ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
             {editMode ? <><X size={18}/> Cancel</> : <><Edit2 size={18}/> Edit</>}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="mx-4 mb-4 bg-gray-100 p-1 rounded-xl flex">
        {['Info', 'Money', 'Log'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === t ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div className="mx-4">

        {/* === TAB 1: INFO === */}
        {tab === 'Info' && (
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            
            {editMode ? (
              /* EDIT FORM */
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 gap-4">
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">Name</label><input value={formData.name || ''} onChange={e=>setFormData({...formData, name:e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold" /></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">Father's Name</label><input value={formData.fathersName || ''} onChange={e=>setFormData({...formData, fathersName:e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" /></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">Address</label><input value={formData.address || ''} onChange={e=>setFormData({...formData, address:e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" /></div>
                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">Mobile</label><input value={formData.mobile || ''} onChange={e=>setFormData({...formData, mobile:e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" /></div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Aadhar</label><input value={formData.aadharNo || ''} onChange={e=>setFormData({...formData, aadharNo:e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" /></div>
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Fee (₹)</label><input type="number" value={formData.monthlyFee || ''} onChange={e=>setFormData({...formData, monthlyFee:e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-green-700" /></div>
                    </div>

                    {/* SHIFT & TIME */}
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                        <label className="text-[10px] font-bold text-blue-400 uppercase mb-2 block">Library Shift</label>
                        <select value={formData.shift || 'Full Day'} onChange={e=>setFormData({...formData, shift:e.target.value})} className="w-full p-3 bg-white rounded-xl border border-blue-200 mb-3 font-bold text-blue-900">
                            <option>Full Day</option>
                            <option>Morning</option>
                            <option>Evening</option>
                        </select>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="time" value={formData.startTime || ''} onChange={e=>setFormData({...formData, startTime:e.target.value})} className="p-2 bg-white rounded-lg border border-blue-200 text-xs font-bold" />
                            <input type="time" value={formData.endTime || ''} onChange={e=>setFormData({...formData, endTime:e.target.value})} className="p-2 bg-white rounded-lg border border-blue-200 text-xs font-bold" />
                        </div>
                    </div>

                    {/* SEAT */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Seat Allocation</label>
                        <select value={formData.seatType || 'Reserved'} onChange={e=>setFormData({...formData, seatType:e.target.value})} className="w-full p-2 bg-white rounded-lg border mb-2 text-sm font-bold">
                            <option value="Reserved">Reserved Seat</option>
                            <option value="General">General Access</option>
                        </select>
                        {formData.seatType === 'Reserved' && (
                            <div className="grid grid-cols-2 gap-2">
                                <select value={formData.roomId || ''} onChange={e=>setFormData({...formData, roomId:e.target.value})} className="p-2 bg-white rounded-lg border text-sm">
                                    {rooms?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                                <input type="number" placeholder="Seat No" value={formData.seat_no || ''} onChange={e=>setFormData({...formData, seat_no:e.target.value})} className="p-2 bg-white rounded-lg border text-sm font-bold" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <button onClick={handleDelete} className="flex-1 text-red-500 py-3 font-bold text-sm bg-red-50 rounded-xl">Delete</button>
                    <button onClick={handleSave} className="flex-[2] bg-black text-white py-3 rounded-xl font-bold flex justify-center gap-2 shadow-lg"><Save size={20}/> Save Changes</button>
                </div>
              </div>
            ) : (
              /* VIEW MODE */
              <div className="space-y-5 text-sm animate-fade-in">
                
                {/* Personal Grid */}
                <div>
                   <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-1"><User size={14}/> Personal Details</h3>
                   <div className="grid grid-cols-1 gap-y-3">
                      <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Father's Name</span> <span className="font-bold text-gray-800">{student.fathersName || '-'}</span></div>
                      <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Address</span> <span className="font-bold text-gray-800 text-right w-1/2 truncate">{student.address || '-'}</span></div>
                      <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Aadhar No</span> <span className="font-bold text-gray-800 tracking-wide">{student.aadharNo || '-'}</span></div>
                      <div className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">Emergency</span> <span className="font-bold text-gray-800">{student.emergencyContact || '-'}</span></div>
                   </div>
                </div>

                {/* Membership Card */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-5 rounded-2xl text-white shadow-lg relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard size={100}/></div>
                   <h3 className="text-xs font-bold text-blue-200 uppercase mb-4">Membership Plan</h3>
                   
                   <div className="grid grid-cols-2 gap-4 relative z-10">
                      <div>
                        <p className="text-xs text-blue-200">Monthly Fee</p>
                        <p className="text-xl font-bold">₹{student.monthlyFee}/-</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-200">Current Shift</p>
                        <p className="text-lg font-bold">{student.shift || 'Full Day'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-200">Time Slot</p>
                        <p className="font-bold">{student.startTime} - {student.endTime}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-200">Joined On</p>
                        <p className="font-bold">{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '-'}</p>
                      </div>
                   </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* === TAB 2: MONEY === */}
        {tab === 'Money' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={handlePayFee} className="w-full bg-green-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-green-100 active:scale-95 transition-transform flex items-center justify-center gap-2">
               <IndianRupee size={20}/> Collect Monthly Fee
            </button>
            <div className="space-y-3">
                {transactions?.map(t => (
                <div key={t.id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                    <div>
                        <p className="font-bold text-gray-800">{t.description}</p>
                        <p className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()} • {new Date(t.date).toLocaleTimeString()}</p>
                    </div>
                    <span className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-lg">+ ₹{t.amount}</span>
                </div>
                ))}
                {transactions?.length === 0 && <div className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-gray-100">No payment history found.</div>}
            </div>
          </div>
        )}

        {/* === TAB 3: LOG === */}
        {tab === 'Log' && (
           <div className="space-y-3 animate-fade-in">
             {attendance?.map(log => (
               <div key={log.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                 <div className="flex items-center gap-3">
                   <div className={`p-2.5 rounded-full ${log.status === 'In' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                     <Calendar size={18}/>
                   </div>
                   <div>
                      <p className="font-bold text-gray-800 text-sm">{new Date(log.date).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-400 font-medium">
                        {log.inTime ? new Date(log.inTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'No In Time'}
                        {' - '}
                        {log.outTime ? new Date(log.outTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '...'}
                      </p>
                   </div>
                 </div>
                 <span className={`px-3 py-1 rounded-md text-xs font-bold ${log.status === 'In' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                   {log.status.toUpperCase()}
                 </span>
               </div>
             ))}
             {attendance?.length === 0 && <div className="text-center text-gray-400 py-10 bg-white rounded-2xl border border-gray-100">No attendance records yet.</div>}
           </div>
        )}

      </div>
    </div>
  );
};

export default StudentProfile;