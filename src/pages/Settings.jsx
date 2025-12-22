import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Download, Upload, Trash2, Plus, LayoutTemplate, ShieldAlert, Building2 } from 'lucide-react';

const Settings = () => {
  const rooms = useLiveQuery(() => db.rooms.toArray());
  const settings = useLiveQuery(() => db.settings.toArray());
  
  // Helper to get current value
  const getValue = (key) => settings?.find(s => s.key === key)?.value || '';

  const [roomForm, setRoomForm] = useState({ name: '', capacity: '' });

  // --- LIBRARY PROFILE LOGIC ---
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const libName = formData.get('libName');
    const libAddress = formData.get('libAddress');

    // Use put to update or insert based on key
    await db.settings.put({ key: 'libraryName', value: libName, id: 1 }); 
    await db.settings.put({ key: 'libraryAddress', value: libAddress, id: 2 });
    
    alert("Library Profile Saved!");
  };

  // --- ROOM LOGIC ---
  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!roomForm.name || !roomForm.capacity) return;
    const cap = parseInt(roomForm.capacity);
    const cols = 5; 
    const rows = Math.ceil(cap / cols);
    await db.rooms.add({ name: roomForm.name, capacity: cap, rows, cols });
    setRoomForm({ name: '', capacity: '' });
  };

  const handleDeleteRoom = async (id) => {
    if (confirm("Delete this room?")) await db.rooms.delete(id);
  };

  // --- BACKUP LOGIC ---
  const handleBackup = async () => {
    try {
      const allData = {
        students: await db.students.toArray(),
        rooms: await db.rooms.toArray(),
        finance: await db.finance.toArray(),
        attendance: await db.attendance.toArray(),
        settings: await db.settings.toArray(),
        date: new Date()
      };
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: "application/json" });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `Granthalaya_Backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
    } catch (err) { alert("Backup Failed"); }
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      if (confirm("Overwrite ALL data?")) {
        const data = JSON.parse(ev.target.result);
        await db.transaction('rw', db.students, db.rooms, db.finance, db.attendance, db.settings, async () => {
          await db.students.clear(); await db.rooms.clear(); await db.finance.clear(); await db.attendance.clear(); await db.settings.clear();
          await db.students.bulkAdd(data.students || []);
          await db.rooms.bulkAdd(data.rooms || []);
          if(data.finance) await db.finance.bulkAdd(data.finance);
          if(data.attendance) await db.attendance.bulkAdd(data.attendance);
          if(data.settings) await db.settings.bulkAdd(data.settings);
        });
        alert("Restored!");
        window.location.reload();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 pb-24 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Configuration</h1>

      {/* 1. LIBRARY PROFILE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 bg-indigo-50/50 flex items-center gap-2">
           <Building2 className="text-indigo-600" size={20}/>
           <h2 className="font-bold text-gray-700">Library Profile</h2>
        </div>
        <form onSubmit={handleSaveProfile} className="p-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">Library Name</label>
            <input name="libName" defaultValue={getValue('libraryName')} placeholder="e.g. City Library" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-bold text-gray-800" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase">Address / Tagline</label>
            <input name="libAddress" defaultValue={getValue('libraryAddress')} placeholder="e.g. MG Road, Pune" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold">Save Details</button>
        </form>
      </div>

      {/* 2. ROOM MANAGER */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 bg-blue-50/50 flex items-center gap-2">
           <LayoutTemplate className="text-blue-600" size={20}/>
           <h2 className="font-bold text-gray-700">Library Zones</h2>
        </div>
        <div className="p-4">
          <div className="space-y-3 mb-4">
            {rooms?.map(room => (
              <div key={room.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div>
                  <p className="font-bold text-gray-800">{room.name}</p>
                  <p className="text-xs text-gray-500">{room.capacity} Seats</p>
                </div>
                <button type="button" onClick={() => handleDeleteRoom(room.id)} className="text-red-400 p-2"><Trash2 size={18}/></button>
              </div>
            ))}
            {rooms?.length === 0 && <p className="text-center text-sm text-gray-400 italic">No rooms yet.</p>}
          </div>
          <form onSubmit={handleAddRoom} className="flex gap-2">
            <input required placeholder="Name (e.g. Hall A)" value={roomForm.name} onChange={e => setRoomForm({...roomForm, name: e.target.value})} className="flex-1 p-3 bg-gray-100 rounded-xl border-transparent focus:bg-white focus:border-blue-500 border transition-all text-sm" />
            <input required type="number" placeholder="Seats" value={roomForm.capacity} onChange={e => setRoomForm({...roomForm, capacity: e.target.value})} className="w-20 p-3 bg-gray-100 rounded-xl border-transparent focus:bg-white focus:border-blue-500 border transition-all text-sm text-center" />
            <button type="submit" className="bg-blue-600 text-white p-3 rounded-xl shadow-lg"><Plus size={24}/></button>
          </form>
        </div>
      </div>

      {/* 3. DATA SAFETY */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-red-50/50 flex items-center gap-2">
           <ShieldAlert className="text-red-600" size={20}/>
           <h2 className="font-bold text-gray-700">Data Safety</h2>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          <button onClick={handleBackup} className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col items-center gap-2">
            <Download className="text-gray-600" /><span className="text-xs font-bold text-gray-600">Backup</span>
          </button>
          <label className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col items-center gap-2 cursor-pointer">
            <Upload className="text-gray-600" /><span className="text-xs font-bold text-gray-600">Restore</span>
            <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
};

export default Settings;