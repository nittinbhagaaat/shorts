'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getStoredSettings } from '@/lib/settings-client';

export default function Sidebar({ isMobileOpen, setIsMobileOpen }) {
  const pathname = usePathname();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    setSettings(getStoredSettings());

    const handleSettingsUpdate = (e) => {
      setSettings(e.detail);
    };

    window.addEventListener('viralclips:settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('viralclips:settings_updated', handleSettingsUpdate);
  }, []);

  const navItems = [
    {
      name: 'Home',
      href: '/',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      description: 'Generate & Overview',
    },
    {
      name: 'Workspaces',
      href: '/workspaces',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      description: 'Saved Projects & Clips',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      description: 'AI Keys & Tool Paths',
    },
  ];

  const activeProvider = settings?.active_ai_provider || 'groq';
  const hasKey = settings && (
    (activeProvider === 'groq' && settings.groq_api_key) ||
    (activeProvider === 'gemini' && settings.gemini_api_key) ||
    (activeProvider === 'mistral' && settings.mistral_api_key) ||
    (activeProvider === 'openai' && settings.openai_api_key)
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#1d2125]/95 backdrop-blur-2xl border-r border-white/8 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding */}
        <div>
          <div className="p-6 border-b border-white/8 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl gradient-button flex items-center justify-center shadow-lg shadow-red-600/30 group-hover:scale-105 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
                  ViralClips
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#dd2222]/20 text-[#ef9595] font-semibold border border-[#dd2222]/30 uppercase tracking-wide">
                    Studio
                  </span>
                </span>
                <p className="text-[11px] text-[#909cac] font-light">Shorts &amp; Captions AI</p>
              </div>
            </Link>

            {/* Mobile close button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-2 text-[#909cac] hover:text-white rounded-lg lg:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all group ${
                    isActive
                      ? 'bg-[#dd2222]/15 border border-[#dd2222]/40 text-white shadow-lg shadow-red-600/10 font-semibold'
                      : 'text-[#909cac] hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-[#dd2222] text-white shadow-md shadow-red-600/40'
                        : 'bg-white/5 text-[#909cac] group-hover:text-white group-hover:bg-white/10'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm block">{item.name}</span>
                    <span className="text-[11px] text-[#6e7d91] font-light block group-hover:text-[#909cac]">
                      {item.description}
                    </span>
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-6 rounded-full bg-[#dd2222] animate-pulse"></div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Health & Configuration Status */}
        <div className="p-4 border-t border-white/8">
          <div className="p-3.5 rounded-2xl bg-[#15181b]/80 border border-white/8 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#909cac]">Local Engine</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                Client Only
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[#909cac] font-light">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#dd2222]"></span>
                  AI Engine
                </span>
                <span className="font-semibold text-white uppercase text-[11px]">
                  {activeProvider}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#909cac] font-light">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${hasKey ? 'bg-emerald-400' : 'bg-[#f59e0b]'}`}></span>
                  API Key
                </span>
                <span className={`text-[11px] font-medium ${hasKey ? 'text-emerald-400' : 'text-[#f59e0b]'}`}>
                  {hasKey ? 'Configured' : 'Missing'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[#909cac] font-light">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2cb7d3]"></span>
                  Storage
                </span>
                <span className="text-[#d7dbe0] font-mono text-[11px]">
                  localStorage
                </span>
              </div>
            </div>

            <Link
              href="/settings"
              onClick={() => setIsMobileOpen(false)}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-[#d7dbe0] hover:text-white border border-white/5 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all text-center"
            >
              <span>⚙️ Manage Settings</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
