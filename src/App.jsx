import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Admission from './pages/Admission';
import Finance from './pages/Finance';
import StudentProfile from './pages/StudentProfile';
import Scanner from './pages/Scanner';
import Attendance from './pages/Attendance';
import LockScreen from './pages/LockScreen';
import { db } from './db/db';
import { performBackup } from './utils/backup';

function App() {
  const [isAuth, setIsAuth] = useState(() => sessionStorage.getItem('isAuth') === 'true');
  const [notification, setNotification] = useState(null);

  // Helper to show temporary toast notification
  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUnlock = async () => {
    sessionStorage.setItem('isAuth', 'true');
    setIsAuth(true);

    // --- AUTOMATIC BACKUP CHECK ---
    try {
      const settings = await db.settings.toArray();
      const autoBackup = settings.find(s => s.key === 'autoBackup')?.value === 'true';
      const lastDate = settings.find(s => s.key === 'lastBackupDate')?.value;
      const today = new Date().toDateString();

      // Run backup if enabled and not done today
      if (autoBackup && lastDate !== today) {
         console.log("Triggering Auto Backup...");
         const success = await performBackup();
         if (success) {
           showNotification("✅ Daily Backup Saved Automatically");
           
           // Update last backup date to prevent loop
           const existingSetting = settings.find(s => s.key === 'lastBackupDate');
           if (existingSetting) {
             await db.settings.updateXH(existingSetting.id, { value: today });
           } else {
             await db.settings.add({ key: 'lastBackupDate', value: today });
           }
         }
      }
    } catch (err) {
      console.error("Auto Backup Check Failed:", err);
    }
  };

  if (!isAuth) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <Router>
      {/* Outer container: darker background for desktop contrast */}
      <div className="min-h-screen bg-gray-200 flex justify-center items-start shadow-inner">
        
        {/* Mobile-styled app container */}
        <div className="w-full max-w-[480px] bg-gray-50 min-h-screen shadow-2xl relative font-sans text-gray-900 select-none pb-24 border-x border-gray-300">
          
          {/* Custom Notification Toast */}
          {notification && (
            <div className="absolute top-5 left-1/2 transform -translate-x-1/2 z-50 bg-black/80 text-white px-4 py-2 rounded-full text-sm shadow-lg animate-fade-in">
              {notification}
            </div>
          )}

          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/student/:id" element={<StudentProfile />} />
            <Route path="/admission" element={<Admission />} />
            <Route path="/scan" element={<Scanner />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
          
          <Navbar />
        </div>
      </div>
    </Router>
  );
}

export default App;