'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getStoredSettings, isAppConfigured } from '@/lib/settings-client';

export default function SetupRequiredModal() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const checkConfiguration = () => {
    const loaded = getStoredSettings();
    const configured = isAppConfigured(loaded);
    // If not configured and NOT on settings page, show the modal
    if (!configured && pathname !== '/settings') {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    checkConfiguration();

    const handleSettingsUpdate = () => {
      checkConfiguration();
    };

    window.addEventListener('viralclips:settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('viralclips:settings_updated', handleSettingsUpdate);
  }, [pathname]);

  // Lock body scroll when modal is visible
  useEffect(() => {
    if (isOpen && pathname !== '/settings') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, pathname]);

  // Never render popup on the Settings page itself
  if (pathname === '/settings' || !isOpen) return null;

  const handleGoToSettings = () => {
    router.push('/settings');
  };

  return (
    <div className="fixed inset-0 lg:left-72 z-50 bg-[#15181b]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1d2125] rounded-2xl p-6 sm:p-8 border border-[#dd2222]/30 space-y-6 text-center">
        
        {/* Badge & Icon */}
        <div className="w-12 h-12 rounded-[10px] bg-[#dd2222]/15 border border-[#dd2222]/30 text-[#ef9595] flex items-center justify-center mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <span className="px-2.5 py-0.5 rounded-[10px] bg-[#dd2222]/15 border border-[#dd2222]/30 text-[#ef9595] text-[11px] font-bold uppercase tracking-wider">
            Configuration Required
          </span>

          <h2 className="text-xl font-bold text-white tracking-tight pt-1">
            Setup Required to Continue
          </h2>

          <p className="text-[#909cac] text-xs font-light leading-relaxed">
            You need to configure your <span className="text-white font-medium">MongoDB URI</span> and at least one <span className="text-white font-medium">AI API Key</span> before using ViralClips Studio.
          </p>
        </div>

        {/* Simple Redirection Action Button */}
        <button
          type="button"
          onClick={handleGoToSettings}
          className="w-full py-3 bg-[#dd2222] hover:bg-[#b91c1c] rounded-[10px] text-white font-semibold text-xs tracking-wide transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Open Settings Page</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

      </div>
    </div>
  );
}
