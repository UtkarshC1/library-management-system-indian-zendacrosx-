import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Users, UserPlus, 
  Wallet, QrCode, ClipboardList, Settings, BookOpen, LogOut, ChevronRight
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/students', icon: Users, label: 'Students' },
    { path: '/attendance', icon: ClipboardList, label: 'Attendance' },
    { path: '/finance', icon: Wallet, label: 'Finance' }
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-72 h-screen fixed left-0 top-0 p-6 z-[100]">
        <div className="luxury-card h-full flex flex-col p-6">
          
          <div className="flex items-center gap-4 px-2 mb-12">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_4px_15px_rgba(37,99,235,0.3)]">
              <BookOpen size={24} strokeWidth={2.5} />
            </div>
            <div>
               <h2 className="text-2xl font-display font-extrabold tracking-tight text-slate-900 leading-none">LibPro</h2>
               <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.3em] mt-1.5">Management</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  group flex items-center justify-between px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-300 relative
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'}
                `}
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-4">
                      <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-blue-600' : 'group-hover:text-blue-500 transition-colors'} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>}
                  </>
                )}
              </NavLink>
            ))}
            <NavLink
              to="/settings"
              className={({ isActive }) => `
                group flex items-center justify-between px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-300 relative
                ${isActive 
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'}
              `}
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-4">
                    <Settings size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-blue-600' : 'group-hover:text-blue-500 transition-colors'} />
                    <span>Settings</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div>}
                </>
              )}
            </NavLink>
          </nav>

          <div className="mt-auto space-y-4">
             <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                   <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                   </div>
                   <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">System Active</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">All systems operational and synced.</p>
             </div>
             
             <button className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-200">
                <LogOut size={18}/> Logout
             </button>
          </div>
        </div>
      </aside>

      {/* MOBILE NAV - Horizontally Scrollable */}
      <nav className="lg:hidden fixed bottom-6 left-4 right-4 z-[200] luxury-card p-3 flex items-center justify-around shadow-2xl backdrop-blur-xl bg-white/90">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-500
              ${isActive ? 'text-blue-600 scale-110' : 'text-slate-400 hover:text-slate-600'}
            `}
          >
            {({ isActive }) => (
              <>
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <div className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.8)] animate-pulse"></div>
                )}
              </>
            )}
          </NavLink>
        ))}
        <NavLink to="/settings" className={({ isActive }) => `flex items-center justify-center w-14 h-14 rounded-2xl transition-all ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
           {({ isActive }) => (
             <>
               <Settings size={24} />
               {isActive && <div className="absolute -bottom-1 w-1 h-1 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.8)]"></div>}
             </>
           )}
        </NavLink>
      </nav>
      
      {/* Page Padding for Sidebar */}
      <div className="hidden lg:block w-72 flex-shrink-0"></div>
    </>
  );
};

export default Sidebar;
