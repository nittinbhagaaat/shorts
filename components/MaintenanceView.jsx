// components/MaintenanceView.jsx
'use client';

import { useState } from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { useAuth } from '@/contexts/AuthContext';

export default function MaintenanceView() {
  const { maintenance, toggleMaintenance, isAdmin, setBypassMaintenance } = useMaintenance();
  const { user, login } = useAuth();

  const [isToggling, setIsToggling] = useState(false);
  const [toggleSuccess, setToggleSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Custom message state for admin editing
  const [customMsg, setCustomMsg] = useState(maintenance.message || '');
  const [isUpdatingMsg, setIsUpdatingMsg] = useState(false);

  // Admin login modal state (for when admin is logged out)
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleToggle = async (targetState) => {
    setIsToggling(true);
    setErrorMessage('');
    try {
      await toggleMaintenance(targetState, customMsg);
      setToggleSuccess(true);
      setTimeout(() => setToggleSuccess(false), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to toggle maintenance mode');
    } finally {
      setIsToggling(false);
    }
  };

  const handleUpdateMessage = async (e) => {
    e.preventDefault();
    setIsUpdatingMsg(true);
    setErrorMessage('');
    try {
      await toggleMaintenance(maintenance.enabled, customMsg);
      setToggleSuccess(true);
      setTimeout(() => setToggleSuccess(false), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update message');
    } finally {
      setIsUpdatingMsg(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const data = await login(adminEmailInput, adminPasswordInput);
      const loggedEmail = (data?.user?.email || adminEmailInput).toLowerCase().trim();
      if (loggedEmail !== 'nitinbhagatxyz@gmail.com' && !data?.user?.isAdmin) {
        setLoginError('Access denied: Only nitinbhagatxyz@gmail.com has administrative access during maintenance.');
      } else {
        setShowAdminLoginModal(false);
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#14171a] text-[#f6f7f8] flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden font-sans select-none">
      {/* Background ambient decorative glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#dd2222]/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#f59e0b]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute inset-0 bg-[radial-gradient(#2d3239_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none"></div>

      {/* Top Header */}
      <header className="relative z-10 max-w-5xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="clip.studio"
            className="w-10 h-10 rounded-xl object-cover border border-[#dd2222]/50 shadow-lg shadow-[#dd2222]/20"
          />
          <div>
            <div className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>clip</span>
              <span className="text-[#dd2222]">.studio</span>
            </div>
            <span className="text-[11px] text-[#909cac] font-medium tracking-wide block">
              AI Video Clipping Engine
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-ping"></span>
            <span>Maintenance Mode</span>
          </div>

          {isAdmin ? (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#360c0c] border border-[#731111] text-[#fca5a5] text-xs font-bold">
              <span>👑 Admin</span>
              <span className="text-white font-mono text-[11px]">nitinbhagatxyz@gmail.com</span>
            </div>
          ) : (
            <button
              onClick={() => setShowAdminLoginModal(true)}
              className="text-xs text-[#909cac] hover:text-white px-2.5 py-1 rounded-lg border border-transparent hover:border-[#39414b] transition-all cursor-pointer"
            >
              Admin Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="relative z-10 max-w-3xl mx-auto w-full my-auto py-10 flex flex-col items-center text-center">
        {/* Animated Maintenance Icon Graphic */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#2d3239] to-[#1d2125] border border-[#39414b] flex items-center justify-center shadow-2xl relative z-10">
            <svg className="w-12 h-12 text-[#f59e0b] animate-[spin_10s_linear_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="absolute -inset-2 bg-gradient-to-r from-[#dd2222]/30 to-[#f59e0b]/30 rounded-3xl blur-lg -z-0"></div>
        </div>

        {/* Headlines */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
          Under Scheduled Maintenance
        </h1>

        <p className="text-[#b9c0ca] text-base sm:text-lg max-w-2xl leading-relaxed mb-8">
          {maintenance.message || 'clip.studio is currently undergoing scheduled maintenance and system optimization. We will be back online shortly!'}
        </p>

        {/* System Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-2xl mb-8">
          <div className="p-3.5 rounded-xl bg-[#1d2125]/80 border border-[#39414b] text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#909cac]">Video Processing</span>
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
            </div>
            <div className="text-sm font-bold text-white">Upgrading Pipelines</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#1d2125]/80 border border-[#39414b] text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#909cac]">AI Architecture</span>
              <span className="w-2 h-2 rounded-full bg-[#2cb7d3]"></span>
            </div>
            <div className="text-sm font-bold text-white">openai/gpt-oss-120b</div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#1d2125]/80 border border-[#39414b] text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#909cac]">User Workspaces</span>
              <span className="w-2 h-2 rounded-full bg-[#22c55e]"></span>
            </div>
            <div className="text-sm font-bold text-white">Saved & Protected</div>
          </div>
        </div>

        {/* Auto-reconnect live status banner */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#2d3239]/90 border border-[#39414b] text-xs text-[#909cac] mb-8">
          <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></span>
          <span>Live status monitor active. This page will automatically reload once maintenance completes.</span>
        </div>

        {/* ============================================================ */}
        {/* ADMIN-ONLY MAINTENANCE CONTROL PANEL (Visible ONLY to Admin) */}
        {/* ============================================================ */}
        {isAdmin && (
          <div className="w-full max-w-2xl mt-4 p-5 sm:p-6 rounded-2xl bg-[#1f1919] border-2 border-[#dd2222]/80 shadow-2xl shadow-[#dd2222]/20 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#dd2222]/30 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#dd2222] text-white text-[10px] font-extrabold uppercase tracking-widest">
                    ADMIN CONTROL
                  </span>
                  <span className="text-sm font-bold text-white">Maintenance Mode Switch</span>
                </div>
                <p className="text-xs text-[#fca5a5] mt-1">
                  Visible solely to admin account (<span className="font-mono font-bold">nitinbhagatxyz@gmail.com</span>).
                </p>
              </div>

              {/* Maintenance Mode Toggle Button */}
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold ${maintenance.enabled ? 'text-amber-400' : 'text-gray-400'}`}>
                  {maintenance.enabled ? 'ACTIVE' : 'DISABLED'}
                </span>
                <button
                  type="button"
                  disabled={isToggling}
                  onClick={() => handleToggle(!maintenance.enabled)}
                  className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#dd2222] ${
                    maintenance.enabled ? 'bg-[#dd2222]' : 'bg-[#39414b]'
                  }`}
                  role="switch"
                  aria-checked={maintenance.enabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      maintenance.enabled ? 'translate-x-8' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Admin Actions Bar */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isToggling}
                  onClick={() => handleToggle(false)}
                  className="py-2.5 px-5 rounded-xl bg-[#22c55e] hover:bg-[#1eb355] text-black font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isToggling ? (
                    <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span>Turn OFF Maintenance & Restore Public Access</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBypassMaintenance(true)}
                  className="py-2.5 px-4 rounded-xl bg-[#2d3239] hover:bg-[#39414b] text-white text-xs font-semibold border border-[#4b5563] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-[#dd2222]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Enter Studio as Admin (Bypass)</span>
                </button>
              </div>

              {/* Edit Announcement Message */}
              <form onSubmit={handleUpdateMessage} className="pt-3 border-t border-[#39414b]/60">
                <label className="block text-xs font-bold text-[#b9c0ca] mb-1.5">
                  Custom Visitor Announcement Message:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    placeholder="Enter announcement message shown to regular visitors..."
                    className="flex-1 px-3 py-2 rounded-xl bg-[#14171a] border border-[#39414b] text-white text-xs focus:outline-none focus:border-[#dd2222]"
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingMsg}
                    className="px-4 py-2 rounded-xl bg-[#360c0c] hover:bg-[#4b1111] text-[#fca5a5] border border-[#731111] text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingMsg ? 'Saving...' : 'Update'}
                  </button>
                </div>
              </form>

              {toggleSuccess && (
                <div className="p-2.5 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] text-xs font-semibold">
                  ✓ Maintenance status updated successfully!
                </div>
              )}
              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-[#dd2222]/15 border border-[#dd2222]/30 text-[#fca5a5] text-xs font-semibold">
                  ⚠️ {errorMessage}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-5xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between text-xs text-[#6e7d91] pt-6 border-t border-[#2d3239]/80 gap-3">
        <div>
          © {new Date().getFullYear()} clip.studio. All projects & user files are preserved and safe.
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
            Core Systems: Upgrading
          </span>
          {!isAdmin && (
            <button
              onClick={() => setShowAdminLoginModal(true)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Admin Sign In
            </button>
          )}
        </div>
      </footer>

      {/* Admin Sign-In Modal */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#1d2125] border border-[#39414b] p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAdminLoginModal(false)}
              className="absolute top-4 right-4 text-[#909cac] hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">👑</span>
              <h3 className="text-lg font-bold text-white">Admin Authentication</h3>
            </div>
            <p className="text-xs text-[#909cac] mb-5">
              Sign in with your designated admin email (<span className="text-white font-mono">nitinbhagatxyz@gmail.com</span>) to manage maintenance controls.
            </p>

            {loginError && (
              <div className="mb-4 p-3 rounded-lg bg-[#dd2222]/15 border border-[#dd2222]/30 text-[#fca5a5] text-xs">
                {loginError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#b9c0ca] mb-1">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  placeholder="nitinbhagatxyz@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#282d33] border border-[#39414b] text-white text-sm focus:outline-none focus:border-[#dd2222]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#b9c0ca] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#282d33] border border-[#39414b] text-white text-sm focus:outline-none focus:border-[#dd2222]"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#dd2222] hover:bg-[#c81e1e] text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>Sign In as Admin</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

