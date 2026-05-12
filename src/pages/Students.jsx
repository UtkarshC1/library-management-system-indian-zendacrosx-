import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, User, AlertCircle, Calendar, Download, 
  Contact, Users, MessageCircle, ChevronRight, FileText, 
  Smartphone, LayoutGrid, ListFilter, CreditCard 
} from 'lucide-react';
import { generateIDCard, generateAdmissionForm } from '../utils/pdfGenerator';

const Students = () => {
  const navigate = useNavigate();
  const students = useLiveQuery(() => db.students.toArray());
  const rooms = useLiveQuery(() => db.rooms.toArray());
  const settings = useLiveQuery(() => db.settings.toArray());
  const allTransactions = useLiveQuery(() => db.finance.toArray());
  const allAttendance = useLiveQuery(() => db.attendance.toArray());
  
  const [search, setSearch] = useState('');
  const [view, setView] = useState('grid'); // 'grid' or 'list'

  const getValue = (key) => settings?.find(s => s.key === key)?.value || '';
  const libraryName = getValue('libraryName') || "Library Management System";
  const libraryAddress = getValue('libraryAddress') || "Reading Hall, City Center";
  const getRoomName = (id) => rooms?.find(r => r.id === id)?.name || 'Unknown';

  const checkFeeStatus = (studentId) => {
    if (!allTransactions) return 'ok';
    const payments = allTransactions.filter(t => t.studentId === studentId && t.type === 'Income');
    if (payments.length === 0) return 'due';
    const lastPay = payments.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const daysSince = (new Date() - new Date(lastPay.date)) / (1000 * 60 * 60 * 24);
    return daysSince > 30 ? 'due' : 'ok';
  };

  const countAttendance = (studentId) => {
    if (!allAttendance) return 0;
    const logs = allAttendance.filter(l => l.studentId === studentId && l.status === 'In');
    return new Set(logs.map(l => new Date(l.date).toDateString())).size;
  };

  const handleIDCard = async (e, student) => {
    e.stopPropagation();
    await generateIDCard(student, libraryName, libraryAddress);
  };

  const handleAdmissionForm = async (e, student) => {
    e.stopPropagation();
    await generateAdmissionForm(student, libraryName, libraryAddress);
  };

  const filtered = students?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.mobile.includes(search) ||
    (s.seat_no && s.seat_no.toString().includes(search))
  ).reverse();

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 space-y-12 animate-reveal">
      
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-slate-200 pb-12">
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                <Users size={22} strokeWidth={2.5} />
             </div>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Student Directory</p>
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-display font-extrabold text-slate-900 tracking-tight leading-none mb-2">Students</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">Database Registry</p>
          </div>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
           <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200">
              <button onClick={() => setView('grid')} className={`p-3 rounded-xl transition-all ${view === 'grid' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}><LayoutGrid size={18}/></button>
              <button onClick={() => setView('list')} className={`p-3 rounded-xl transition-all ${view === 'list' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}><ListFilter size={18}/></button>
           </div>
           <button onClick={() => navigate('/admission')} className="btn-luxury btn-luxury-primary flex items-center gap-2 px-8">
              <Plus size={20}/> Admission
           </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-white p-4 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm">
         <div className="relative w-full md:max-w-xl group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
               placeholder="Search registry..." 
               value={search} onChange={e => setSearch(e.target.value)}
               className="luxury-card w-full pl-16 pr-8 py-4 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 text-slate-900 font-bold placeholder:text-slate-400 outline-none shadow-none text-sm"
            />
         </div>
         <div className="flex items-center justify-around md:justify-end gap-6 md:gap-8 w-full md:w-auto px-2 md:px-6">
            <div className="text-center md:text-right">
               <p className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Students</p>
               <p className="text-lg md:text-xl font-display font-extrabold text-slate-900 leading-none">{students?.length || 0}</p>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors">
               <Download size={16}/>
               <span className="text-[9px] font-bold uppercase tracking-widest">Report</span>
            </button>
         </div>
      </div>

      {/* GRID VIEW */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
           {filtered?.map((student) => {
             const feeStatus = checkFeeStatus(student.id);
             const attendanceCount = countAttendance(student.id);
             return (
                <div 
                 key={student.id} 
                 onClick={() => navigate(`/student/${student.id}`)}
                 className="luxury-card luxury-card-hover group p-0 overflow-hidden flex flex-col h-full cursor-pointer transition-all duration-500"
               >
                  {/* Card Header Background */}
                  <div className="h-24 bg-gradient-to-br from-blue-50 to-indigo-50 relative overflow-hidden">
                     <div className="absolute top-4 right-4 flex gap-2">
                        {feeStatus === 'due' && <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>}
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                     </div>
                  </div>

                  {/* Profile Info */}
                  <div className="px-8 pb-8 flex-1 flex flex-col items-center -mt-12">
                     <div className="w-24 h-24 rounded-[2rem] bg-white border-4 border-white shadow-md overflow-hidden mb-4 relative group-hover:scale-110 transition-transform duration-500">
                        {student.photo ? <img src={student.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50"><Users size={32}/></div>}
                     </div>
                     
                     <h3 className="text-lg md:text-xl font-display font-extrabold text-slate-900 text-center leading-none mb-1.5 md:mb-2 group-hover:text-blue-600 transition-colors">{student.name}</h3>
                     <div className="flex items-center gap-2 text-slate-500 text-[11px] md:text-xs font-bold mb-4 md:mb-6">
                        <Smartphone size={12}/> {student.mobile}
                     </div>

                     <div className="grid grid-cols-2 gap-2 md:gap-3 w-full mb-6 md:mb-8">
                        <div className="bg-slate-50 border border-slate-100 p-2.5 md:p-3 rounded-xl md:rounded-2xl text-center">
                           <p className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1">Zone</p>
                           <p className="text-[11px] md:text-xs font-extrabold text-slate-900 truncate">{student.seatType === 'Reserved' ? `${getRoomName(student.roomId)}` : 'General'}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-2.5 md:p-3 rounded-xl md:rounded-2xl text-center relative">
                           {student.status === 'Inactive' && (
                              <div className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10">INACTIVE</div>
                           )}
                           <p className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 md:mb-1">Seat</p>
                           <p className="text-[11px] md:text-xs font-extrabold text-slate-900">{student.seat_no || '-'}</p>
                        </div>
                     </div>

                     <div className="w-full space-y-2 md:space-y-3 mt-auto">
                        <div className="flex justify-between items-center text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">
                           <span>Attendance Status</span>
                           <span className="text-blue-600">{attendanceCount} Days</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(attendanceCount * 4, 100)}%` }}></div>
                        </div>
                     </div>
                  </div>
                  
                  {/* Card Bottom Action */}
                  <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between group-hover:bg-blue-50 transition-colors">
                     <div className="flex gap-2">
                        <button onClick={(e) => handleIDCard(e, student)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="ID Card">
                           <CreditCard size={14}/>
                        </button>
                        <button onClick={(e) => handleAdmissionForm(e, student)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm" title="Admission Form">
                           <FileText size={14}/>
                        </button>
                     </div>
                     <div className="flex items-center gap-2 text-slate-500 group-hover:text-blue-600 transition-colors">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest">Details</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                     </div>
                  </div>
               </div>
             );
           })}
        </div>
      )}

      {/* LIST VIEW (Table) */}
      {view === 'list' && (
        <div className="luxury-table-container">
           <table className="luxury-table">
              <thead>
                 <tr>
                    <th>Student Info</th>
                    <th>Seat Details</th>
                    <th>Status</th>
                    <th>Mobile</th>
                    <th className="text-right">Action</th>
                 </tr>
              </thead>
              <tbody>
                 {filtered?.map(student => (
                   <tr key={student.id} onClick={() => navigate(`/student/${student.id}`)} className="cursor-pointer group">
                      <td>
                         <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden p-0.5 shadow-sm">
                               {student.photo ? <img src={student.photo} className="w-full h-full object-cover rounded-xl" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><User size={20}/></div>}
                            </div>
                            <div>
                               <p className="font-bold text-slate-900 tracking-tight leading-none mb-1 group-hover:text-blue-600 transition-colors">{student.name}</p>
                               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Student ID: #{student.id}</p>
                            </div>
                         </div>
                      </td>
                      <td>
                         <p className="text-xs font-extrabold text-slate-600 uppercase tracking-tight">
                            {student.seatType === 'Reserved' ? `${getRoomName(student.roomId)} • ${student.seat_no}` : 'General Access'}
                         </p>
                      </td>
                      <td>
                         <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${checkFeeStatus(student.id) === 'due' ? 'bg-rose-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">{countAttendance(student.id)} Logs</span>
                         </div>
                      </td>
                      <td>
                         <p className="text-xs font-bold text-slate-600 tracking-[0.1em]">{student.mobile}</p>
                      </td>
                      <td className="text-right">
                         <div className="flex justify-end gap-2">
                            <button onClick={(e) => handleIDCard(e, student)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all" title="ID Card"><CreditCard size={16}/></button>
                            <button onClick={(e) => handleAdmissionForm(e, student)} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all" title="Admission Form"><FileText size={16}/></button>
                            <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all"><ChevronRight size={16}/></button>
                         </div>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}

      {filtered?.length === 0 && (
        <div className="text-center py-32 luxury-card border-dashed bg-white group hover:border-blue-200 transition-all duration-500">
           <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm group-hover:bg-blue-50 group-hover:scale-110 transition-all duration-500">
              <Search size={32} className="text-slate-400 group-hover:text-blue-500 transition-colors"/>
           </div>
           <h3 className="text-2xl font-display font-bold text-slate-900 mb-2 uppercase tracking-widest group-hover:text-blue-600 transition-colors">No Students Found</h3>
           <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Adjust your search parameters and try again.</p>
        </div>
      )}
    </div>
  );
};

export default Students;