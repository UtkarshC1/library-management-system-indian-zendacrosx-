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
import { performBackup } from './utils/backup'; // Import utility

function App() {
  const [isAuth, setIsAuth] = useState(sessionStorage.getItem('isAuth') === 'true');

  const handleUnlock = async () => {
    sessionStorage.setItem('isAuth', 'true');
    setIsAuth(true);

    // --- AUTOMATIC BACKUP CHECK ---
    try {
      const settings = await db.settings.toArray();
      const autoBackup = settings.find(s => s.key === 'autoBackup')?.value === 'true';
      const lastDate = settings.find(s => s.key === 'lastBackupDate')?.value;
      const today = new Date().toDateString();

      // If Auto Backup is ON and Last Backup was NOT today
      if (autoBackup && lastDate !== today) {
         console.log("Triggering Auto Backup...");
         const success = await performBackup();
         if(success) {
           // Small notification (using generic alert, or you can use a toast component if you have one)
           setTimeout(() => alert("✅ Daily Backup Downloaded Successfully"), 500);
         }
      }
    } catch(err) {
      console.error("Auto Backup Check Failed", err);
    }
  };

  if (!isAuth) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-200 flex justify-center items-start">
        <div className="w-full max-w-[480px] bg-gray-50 min-h-screen shadow-2xl relative font-sans text-gray-900 select-none pb-24">
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