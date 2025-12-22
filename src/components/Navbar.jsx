import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, Users, Scan, Wallet, Settings } from 'lucide-react';

const Navbar = () => {
  const navClass = ({ isActive }) => 
    `flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
      isActive ? 'text-blue-600 scale-105' : 'text-gray-400'
    }`;

  return (
    /* Fixed to bottom, but limited to max-w-[480px] to match App Shell */
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-16 bg-white border-t border-gray-100 flex justify-between items-center z-50 px-2 pb-1 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
      
      <NavLink to="/" className={navClass}>
        <LayoutGrid size={22} strokeWidth={2} />
        <span className="text-[10px] font-medium">Grid</span>
      </NavLink>
      
      <NavLink to="/students" className={navClass}>
        <Users size={22} strokeWidth={2} />
        <span className="text-[10px] font-medium">Students</span>
      </NavLink>

      <NavLink to="/scan" className="relative -top-6">
        <div className="bg-blue-600 rounded-full p-4 shadow-xl shadow-blue-200 border-4 border-gray-50 active:scale-95 transition-transform flex items-center justify-center">
          <Scan size={26} color="white" />
        </div>
      </NavLink>

      <NavLink to="/finance" className={navClass}>
        <Wallet size={22} strokeWidth={2} />
        <span className="text-[10px] font-medium">Money</span>
      </NavLink>

      <NavLink to="/settings" className={navClass}>
        <Settings size={22} strokeWidth={2} />
        <span className="text-[10px] font-medium">Settings</span>
      </NavLink>

    </div>
  );
};

export default Navbar;