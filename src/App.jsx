import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
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
import { useDataPersistence } from './hooks/useDataPersistence';
import { ShieldAlert, X, Zap, Bell, CheckCircle } from 'lucide-react';

function App() {
  const [isAuth, setIsAuth] = useState(() => sessionStorage.getItem('isAuth') === 'true');
  const [notification, setNotification] = useState(null);
  const { isPersistent, showPrompt, setShowPrompt } = useDataPersistence();

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleUnlock = async () => {
    sessionStorage.setItem('isAuth', 'true');
    setIsAuth(true);

    try {
      const settings = await db.settings.toArray();
      const autoBackup = settings.find(s => s.key === 'autoBackup')?.value === 'true';
      const lastDate = settings.find(s => s.key === 'lastBackupDate')?.value;
      const today = new Date().toDateString();

      if (autoBackup && lastDate !== today) {
         const success = await performBackup();
         if (success) {
           showNotification("Auto Backup Completed");
           const existingSetting = settings.find(s => s.key === 'lastBackupDate');
           if (existingSetting) await db.settings.update(existingSetting.id, { value: today });
           else await db.settings.add({ key: 'lastBackupDate', value: today });
         }
      }

      if (!lastDate) {
         setTimeout(() => showNotification("Warning: No backups found"), 4000);
      }
    } catch (err) {}
  };

  if (!isAuth) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <Router>
      {/* Luxury Notification HUD */}
      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1000] luxury-card px-8 py-4 flex items-center gap-4 border border-blue-100 bg-white shadow-md animate-reveal">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
             <Bell size={18} className="animate-pulse" />
          </div>
          <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">{notification}</p>
          <button onClick={() => setNotification(null)} className="ml-4 text-slate-400 hover:text-slate-900 transition-colors">
             <X size={16} />
          </button>
        </div>
      )}

      {/* Persistence Warning HUD */}
      {showPrompt && !isPersistent && (
        <div className="fixed bottom-8 right-8 z-[1000] luxury-card p-6 border border-rose-100 bg-white shadow-md animate-reveal max-w-sm flex items-start gap-4">
           <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 shadow-sm">
              <ShieldAlert size={24}/>
           </div>
           <div className="flex-1">
             <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-1">Storage Alert</h4>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Browser storage may not be persistent. Bookmark this page to ensure your data is saved.</p>
           </div>
           <button onClick={() => setShowPrompt(false)} className="text-slate-400 hover:text-slate-900"><X size={16}/></button>
        </div>
      )}

      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/student/:id" element={<StudentProfile />} />
          <Route path="/admission" element={<Admission />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;