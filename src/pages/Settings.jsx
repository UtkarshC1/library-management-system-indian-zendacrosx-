import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Download, Upload, Trash2, Plus, LayoutTemplate, ShieldAlert, Building2, Save, Settings as SettingsIcon, ChevronRight, Zap, Database, ShieldCheck, Server } from 'lucide-react';
import { performBackup } from '../utils/backup';

const Settings = () => {
  const rooms = useLiveQuery(() => db.rooms.toArray());
  const settings = useLiveQuery(() => db.settings.toArray());
  
  const getValue = (key) => settings?.find(s => s.key === key)?.value || '';

  const [roomForm, setRoomForm] = useState({ name: '', capacity: '' });
  const [saveMsg, setSaveMsg] = useState('');

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const saveSetting = async (key, val) => {
        const exist = await db.settings.where('key').equals(key).first();
        if(exist) await db.settings.update(exist.id, { value: val });
        else await db.settings.add({ key, value: val });
    };
    await saveSetting('libraryName', formData.get('libName'));
    await saveSetting('libraryAddress', formData.get('libAddress'));
    setSaveMsg('✓ Saved Successfully');
    setTimeout(() => setSaveMsg(''), 2500);
  };

  const toggleAutoBackup = async () => {
    const current = getValue('autoBackup') === 'true';
    const exist = await db.settings.where('key').equals('autoBackup').first();
    if(exist) await db.settings.update(exist.id, { value: (!current).toString() });
    else await db.settings.add({ key: 'autoBackup', value: 'true' });
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!roomForm.name || !roomForm.capacity) return;
    const cap = parseInt(roomForm.capacity);
    await db.rooms.add({ name: roomForm.name, capacity: cap, rows: Math.ceil(cap/5), cols: 5 });
    setRoomForm({ name: '', capacity: '' });
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log("Starting restore from file:", file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const content = ev.target.result;
        if (!content) throw new Error("Empty file content");
        
        const data = JSON.parse(content);
        console.log("JSON parsed successfully. Data keys:", Object.keys(data));
        await restoreData(data);
      } catch(err) { 
        console.error("Restore Error:", err);
        alert(`RESTORE_FAILED: ${err.message || "Invalid JSON"}`); 
      }
    };
    reader.onerror = (err) => {
      console.error("FileReader Error:", err);
      alert("FILE_READ_ERROR: Could not read the selected file.");
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const restoreData = async (data) => {
    if (!data || typeof data !== 'object') {
      alert("INVALID_DATA_FORMAT: Root must be an object.");
      return;
    }

    const confirmMsg = "DANGER: This will delete ALL existing data and overwrite it with the backup. This action cannot be undone. Proceed?";
    if (confirm(confirmMsg)) {
      try {
        // Use a more robust transaction approach
        await db.transaction('rw', [db.students, db.rooms, db.finance, db.attendance, db.settings], async () => {
          console.log("Transaction started. Clearing tables...");
          
          await Promise.all([
            db.students.clear(),
            db.rooms.clear(),
            db.finance.clear(),
            db.attendance.clear(),
            db.settings.clear()
          ]);
          
          console.log("Tables cleared. Adding new data...");

          // Helper to add data if it exists and sanitize dates
          const addTableData = async (table, items, name) => {
            if (items && Array.isArray(items) && items.length > 0) {
              console.log(`Sanitizing ${name} data...`);
              
              const sanitizedItems = items.map(item => {
                const newItem = { ...item };
                // Convert date strings back to Date objects for critical fields
                if (name === 'attendance' || name === 'finance') {
                  if (newItem.date && typeof newItem.date === 'string') newItem.date = new Date(newItem.date);
                  if (newItem.inTime && typeof newItem.inTime === 'string') newItem.inTime = new Date(newItem.inTime);
                  if (newItem.outTime && typeof newItem.outTime === 'string') newItem.outTime = new Date(newItem.outTime);
                }
                if (name === 'students' && newItem.admissionDate && typeof newItem.admissionDate === 'string') {
                   newItem.admissionDate = new Date(newItem.admissionDate);
                }
                return newItem;
              });

              console.log(`Adding ${sanitizedItems.length} items to ${name}...`);
              await table.bulkPut(sanitizedItems);
            } else {
              console.log(`No valid items found for ${name}.`);
            }
          };

          await addTableData(db.students, data.students, "students");
          await addTableData(db.rooms, data.rooms, "rooms");
          await addTableData(db.finance, data.finance, "finance");
          await addTableData(db.attendance, data.attendance, "attendance");
          await addTableData(db.settings, data.settings, "settings");
        });

        console.log("Restore transaction completed successfully.");
        alert("Success! Your library database has been fully restored.");
        window.location.reload();
      } catch (err) {
        console.error("Transaction failed:", err);
        alert(`INTEGRITY_CHECK_FAILED: ${err.message || "Database transaction error"}`);
      }
    }
  };

  const handleManualImport = () => {
    const json = prompt("Paste your backup JSON here:");
    if (!json) return;
    try {
      const data = JSON.parse(json);
      restoreData(data);
    } catch (e) { alert("Invalid JSON format"); }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-12 space-y-12 animate-reveal relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50 blur-[150px] -z-10 rounded-full"></div>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-slate-200 pb-12">
        <div className="flex items-center gap-6">
           <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
              <SettingsIcon size={24} className="md:w-7 md:h-7" strokeWidth={2.5} />
           </div>
           <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse"></div>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Settings</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-display font-extrabold text-slate-900 tracking-tight leading-none mb-1">Configuration</h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">Manage library details and data</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Core & Data Hub */}
        <div className="lg:col-span-7 space-y-8 md:space-y-12">
           <div className="luxury-card p-6 md:p-12 space-y-8 md:space-y-10 border-slate-200 shadow-sm relative">
              <div className="absolute top-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-blue-500/10 to-transparent"></div>
              
              <div className="flex items-center gap-5">
                 <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><Building2 size={24} strokeWidth={2.5}/></div>
                 <h3 className="text-xl font-display font-extrabold text-slate-900 tracking-tight">Library Details</h3>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Library Name</label>
                       <input name="libName" defaultValue={getValue('libraryName')} className="input-luxury font-bold h-16" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Address</label>
                       <input name="libAddress" defaultValue={getValue('libraryAddress')} className="input-luxury h-16" />
                    </div>
                 </div>
                 <div className="flex items-center justify-between pt-4">
                    <button type="submit" className="btn-luxury btn-luxury-primary px-10">
                       <Save size={20}/> Save Details
                    </button>
                    {saveMsg && <span className="text-[10px] font-bold text-emerald-600 animate-pulse">{saveMsg}</span>}
                 </div>
              </form>
           </div>

           <div className="luxury-card p-6 md:p-12 space-y-8 md:space-y-10 border-slate-200 shadow-sm relative">
              <div className="flex items-center gap-5">
                 <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><Database size={24} strokeWidth={2.5}/></div>
                 <h3 className="text-xl font-display font-extrabold text-slate-900 tracking-tight">Data Management</h3>
              </div>
              
              <div className="luxury-card p-8 flex items-center justify-between bg-slate-50 border-slate-200 group hover:border-blue-300 hover:bg-slate-100 transition-all shadow-sm">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-blue-600 shadow-sm transition-colors">
                       <Server size={24}/>
                    </div>
                    <div>
                       <p className="font-bold text-slate-900 tracking-tight text-lg leading-none mb-1.5">Auto Backup</p>
                       <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Automatic daily backups</p>
                    </div>
                 </div>
                 <button onClick={toggleAutoBackup} className={`w-14 h-7 rounded-full p-1 transition-all duration-500 ${getValue('autoBackup') === 'true' ? 'bg-blue-600 shadow-sm' : 'bg-slate-200 border border-slate-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-500 ${getValue('autoBackup') === 'true' ? 'translate-x-7' : ''}`}></div>
                 </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                 <button onClick={() => performBackup()} className="luxury-card p-6 md:p-10 flex flex-col items-center gap-4 md:gap-6 bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all group shadow-sm">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] bg-white border border-slate-200 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-sm">
                       <Download size={24} className="md:w-7 md:h-7" strokeWidth={2.5}/>
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold text-slate-500 group-hover:text-blue-700 uppercase tracking-[0.3em] transition-colors text-center">Export Backup</span>
                 </button>
                  <div className="space-y-4">
                    <label className="luxury-card p-6 md:p-10 flex flex-col items-center gap-4 md:gap-6 bg-slate-50 border-slate-200 hover:bg-blue-50 hover:border-blue-300 transition-all group cursor-pointer shadow-sm w-full">
                       <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-[1.5rem] bg-white border border-slate-200 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all shadow-sm">
                          <Upload size={24} className="md:w-7 md:h-7" strokeWidth={2.5}/>
                       </div>
                       <span className="text-[9px] md:text-[10px] font-bold text-slate-500 group-hover:text-blue-700 uppercase tracking-[0.3em] transition-colors text-center">Restore File</span>
                       <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                    </label>
                  </div>
              </div>
           </div>
        </div>

        {/* Infrastructure Hub */}
        <div className="lg:col-span-5 h-full">
           <div className="luxury-card p-6 md:p-12 h-full flex flex-col border-slate-200 shadow-sm relative">
              <div className="flex items-center gap-5 mb-8 md:mb-12">
                 <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm"><LayoutTemplate size={24} strokeWidth={2.5}/></div>
                 <h3 className="text-xl font-display font-extrabold text-slate-900 tracking-tight">Room Management</h3>
              </div>

              <form onSubmit={handleAddRoom} className="grid grid-cols-1 gap-4 mb-12">
                 <div className="flex gap-4">
                    <input placeholder="Room Name" value={roomForm.name} onChange={e=>setRoomForm({...roomForm, name:e.target.value})} className="flex-1 input-luxury font-bold h-14" />
                    <input type="number" placeholder="Cap" value={roomForm.capacity} onChange={e=>setRoomForm({...roomForm, capacity:e.target.value})} className="w-24 input-luxury font-bold h-14 text-center" />
                 </div>
                 <button type="submit" className="w-full btn-luxury btn-luxury-primary py-4">
                    <Plus size={20}/> Add Room
                 </button>
              </form>

              <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-4">
                 {rooms?.map(room => (
                   <div key={room.id} className="luxury-card p-6 flex items-center justify-between bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 transition-all group shadow-sm">
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-display font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors shadow-sm">{room.capacity}</div>
                         <div>
                            <p className="font-bold text-slate-900 text-lg tracking-tight leading-none mb-1 group-hover:text-blue-600 transition-colors">{room.name}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Room</p>
                         </div>
                      </div>
                      <button onClick={() => { if(confirm("Delete this room?")) db.rooms.delete(room.id); }} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                   </div>
                 ))}
                 {rooms?.length === 0 && (
                   <div className="text-center py-32 opacity-60">
                      <Zap size={48} className="mx-auto mb-6 text-slate-300"/>
                      <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500">No Rooms Added</p>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;