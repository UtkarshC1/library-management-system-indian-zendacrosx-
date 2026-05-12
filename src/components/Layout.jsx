import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex text-slate-900 bg-transparent">
      <Sidebar />
      <main className="flex-1 w-full relative min-h-screen overflow-x-hidden p-0">
        <div className="w-full h-full">
           {children}
        </div>
        {/* Bottom padding for mobile nav */}
        <div className="h-32 lg:hidden"></div>
      </main>
    </div>
  );
};

export default Layout;
