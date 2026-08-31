'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import SetupRequiredModal from './SetupRequiredModal';

export default function DashboardLayout({ children }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#15181b] text-white flex flex-col overflow-x-hidden font-sans">
      {/* Mandatory First-Time Setup Modal */}
      <SetupRequiredModal />

      {/* Sidebar Navigation */}
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0 z-10">
        
        {/* Mobile Header Bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#1d2125] border-b border-white/8 px-4 py-3.5 flex items-center justify-between">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-[10px] bg-white/5 border border-white/10 text-[#d7dbe0] hover:text-white"
            aria-label="Open menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[10px] bg-[#dd2222] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-bold text-sm text-white">ViralClips Studio</span>
          </div>

          <div className="w-9"></div>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>
    </div>
  );
}
