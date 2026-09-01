'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getStoredSettings } from '@/lib/settings';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [settings, setSettings] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setSettings(getStoredSettings());

    const handleSettingsUpdate = (e) => {
      setSettings(e.detail);
    };

    window.addEventListener('shorts_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('shorts_settings_updated', handleSettingsUpdate);
  }, []);

  const navItems = [
    {
      name: 'Home',
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      active: pathname === '/',
    },
    {
      name: 'Workspaces',
      href: '/workspaces',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      active: pathname === '/workspaces' || pathname.startsWith('/project/'),
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      active: pathname === '/settings',
    },
  ];

  const providerNames = {
    mistral: 'Mistral AI',
    gemini: 'Google Gemini',
    openai: 'OpenAI GPT',
    groq: 'Groq LPU',
  };

  const currentProvider = settings?.aiProvider || 'mistral';
  const hasKey = Boolean(
    (currentProvider === 'groq' && settings?.groqKey) ||
    (currentProvider === 'mistral' && settings?.mistralKey) ||
    (currentProvider === 'gemini' && settings?.geminiKey) ||
    (currentProvider === 'openai' && settings?.openaiKey)
  );

  return (
    <div className="min-h-screen bg-[#1d2125] text-[#f6f7f8] flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 border-b border-[#39414b] bg-[#2d3239] sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="clip.studio logo"
            className="w-8 h-8 rounded-[10px] object-cover border border-[#dd2222]/40"
          />
          <span className="font-bold text-lg text-white">clip<span className="text-[#dd2222]">.studio</span></span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-[10px] bg-[#39414b] border border-[#4b5563] text-gray-200"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 border-r border-[#39414b] bg-[#2d3239] transition-all duration-200 sticky top-0 h-screen z-30 ${
          isCollapsed ? 'w-20 p-3' : 'w-64 p-5'
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="clip.studio logo"
                className="w-9 h-9 rounded-[10px] object-cover border border-[#dd2222]/50 shrink-0"
              />
              {!isCollapsed && (
                <div>
                  <h1 className="font-bold text-base text-white tracking-tight leading-none">
                    clip<span className="text-[#dd2222]">.studio</span>
                  </h1>
                  <span className="text-[11px] text-[#909cac] font-medium tracking-wide block mt-1">
                    AI Video Studio
                  </span>
                </div>
              )}
            </Link>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-[10px] text-[#909cac] hover:text-white hover:bg-[#39414b] transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className={`w-4 h-4 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-[10px] font-medium text-sm transition-all duration-150 ${
                  item.active
                    ? 'bg-[#360c0c] border border-[#731111] text-[#fcf2f2]'
                    : 'text-[#b9c0ca] hover:text-white hover:bg-[#39414b] border border-transparent'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <div
                  className={`shrink-0 ${
                    item.active ? 'text-[#dd2222]' : 'text-[#909cac]'
                  }`}
                >
                  {item.icon}
                </div>
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </nav>
        </div>

        {/* Sidebar Footer / AI Status */}
        <div className="pt-4 border-t border-[#39414b] space-y-3">
          {!isCollapsed ? (
            <div className="p-3 rounded-[10px] bg-[#1d2125] border border-[#39414b] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#909cac] font-medium">Active AI Engine</span>
                <span
                  className={`px-2 py-0.5 rounded-[10px] text-[10px] font-bold uppercase tracking-wider ${
                    hasKey
                      ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30'
                      : 'bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/30'
                  }`}
                >
                  {hasKey ? 'Ready' : 'Fallback'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#dd2222]"></span>
                  {providerNames[currentProvider] || currentProvider}
                </span>
                <Link
                  href="/settings"
                  className="text-[11px] text-[#2cb7d3] hover:underline"
                >
                  Configure
                </Link>
              </div>
              <div className="text-[10px] text-[#6e7d91] truncate font-mono">
                Storage: localStorage (100% Client)
              </div>
            </div>
          ) : (
            <Link
              href="/settings"
              className="w-10 h-10 mx-auto rounded-[10px] bg-[#1d2125] border border-[#39414b] flex items-center justify-center text-[#2cb7d3] hover:bg-[#39414b] transition-all"
              title="Configure Settings"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]"></div>
            </Link>
          )}

          {!isCollapsed && (
            <div className="text-[11px] text-[#6e7d91] text-center font-normal">
              clip.studio • open source
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Dropdown Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bg-[#2d3239] border-b border-[#39414b] p-4 z-40 space-y-3">
          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-[10px] font-medium text-sm transition-all ${
                  item.active
                    ? 'bg-[#360c0c] border border-[#731111] text-[#fcf2f2]'
                    : 'text-[#b9c0ca] hover:text-white hover:bg-[#39414b]'
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
          <div className="pt-2 border-t border-[#39414b] flex items-center justify-between text-xs text-[#909cac]">
            <span>Engine: {providerNames[currentProvider]}</span>
            <Link
              href="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-[#2cb7d3] underline font-medium"
            >
              Settings
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
