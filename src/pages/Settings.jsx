import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Download, Upload, Trash2, Plus, LayoutTemplate, ShieldAlert, Building2, Save } from 'lucide-react';
import { performBackup } from '../utils/backup'; // Import the helper

const Settings = () => {
  const rooms = useLiveQuery(() => db.rooms.toArray());
  const settings = useLiveQuery(() => db.settings.toArray());
  
  const getValue = (key) => settings?.find(s => s.key === key)?.value || '';

  const [roomForm, setRoomForm] = useState({ name: '', capacity: '' });

  // --- LIBRARY PROFILE ---
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Helper to update/add setting
    const saveSetting = async (key, val) => {
        const exist = await db.settings.where('key').equals(key).first();
        if(exist) await db.settings.update(exist.id, { value: val });
        else await db.settings.add({ key, value: val });
    };

    await saveSetting('libraryName', formData.get('libName'));
    await saveSetting('libraryAddress', formData.get('libAddress'));
    alert("Library Profile Saved!");
  };

  // --- TOGGLE AUTO BACKUP ---
  const toggleAutoBackup = async () => {
    const current = getValue('autoBackup') === 'true';
    const exist = await db.settings.where('key').equals('autoBackup').first();
    if(exist) await db.settings.update(exist.id, { value: (!current).toString() });
    else await db.settings.add({ key: 'autoBackup', value: 'true' });
  };

  // --- ROOM LOGIC ---
  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!roomForm.name || !roomForm.capacity) return;
    const cap = parseInt(roomForm.capacity);
    await db.rooms.add({ name: roomForm.name, capacity: cap, rows: Math.ceil(cap/5), cols: 5 });
    setRoomForm({ name: '', capacity: '' });
  };

  const handleDeleteRoom = async (id) => {
    if (confirm("Delete this room?")) await db.rooms.delete(id);
  };

  // --- RESTORE LOGIC ---
  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      if (confirm("Overwrite ALL data? This cannot be undone.")) {
        try {
            const data = JSON.parse(ev.target.result);
            await db.transaction('rw', db.students, db.rooms, db.finance, db.attendance, db.settings, async () => {
            await db.students.clear(); await db.rooms.clear(); await db.finance.clear(); await db.attendance.clear(); await db.settings.clear();
            await db.students.bulkAdd(data.students || []);
            await db.rooms.bulkAdd(data.rooms || []);
            if(data.finance) await db.finance.bulkAdd(data.finance);
            if(data.attendance) await db.attendance.bulkAdd(data.attendance);
            if(data.settings) await db.settings.bulkAdd(data.settings);
            });
            alert("Restored Successfully!");
            window.location.reload();
        } catch(err) { alert("Invalid Backup File"); }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 pb-24 min-h-screen bg-gray-50">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Configuration</h1>

      {/* 1. LIBRARY PROFILE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 bg-indigo-50 flex items-center gap-2">
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
          <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2"><Save size={18}/> Save Details</button>
        </form>
      </div>

      {/* 2. DATA SAFETY (UPDATED) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 border-b border-gray-100 bg-red-50 flex items-center gap-2">
           <ShieldAlert className="text-red-600" size={20}/>
           <h2 className="font-bold text-gray-700">Data Safety</h2>
        </div>
        <div className="p-4 space-y-4">
            {/* Auto Backup Toggle */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                    <p className="font-bold text-gray-800 text-sm">Auto Backup (Daily)</p>
                    <p className="text-[10px] text-gray-500">Download backup automatically on open.</p>
                </div>
                <button 
                  onClick={toggleAutoBackup} 
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${getValue('autoBackup') === 'true' ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${getValue('autoBackup') === 'true' ? 'translate-x-6' : ''}`}></div>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => performBackup()} className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col items-center gap-2 active:bg-gray-100 transition-colors">
                    <Download className="text-gray-600" /><span className="text-xs font-bold text-gray-600">Download Now</span>
                </button>
                <label className="bg-gray-50 border border-gray-200 p-4 rounded-xl flex flex-col items-center gap-2 cursor-pointer active:bg-gray-100 transition-colors">
                    <Upload className="text-gray-600" /><span className="text-xs font-bold text-gray-600">Restore File</span>
                    <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                </label>
            </div>
            
            <p className="text-[10px] text-center text-gray-400">Last Backup: {getValue('lastBackupDate') || 'Never'}</p>
        </div>
      </div>

      {/* 3. ROOM MANAGER */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-blue-50 flex items-center gap-2">
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
    </div>
  );
};

export default Settings;