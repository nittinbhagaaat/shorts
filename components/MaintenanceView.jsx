// components/MaintenanceView.jsx
'use client';

import { useState } from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { isEmailAdmin } from '@/lib/constants';

export default function MaintenanceView() {
  const { maintenance, toggleMaintenance, isAdmin, setBypassMaintenance } = useMaintenance();
  const { user, login } = useAuth();
  const isAuthorizedAdmin = Boolean(isAdmin && user && user.email && isEmailAdmin(user.email));

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
      if (!data?.user?.email || !isEmailAdmin(data.user.email)) {
        setLoginError('Access denied: Administrator privileges required.');
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
    <div className="min-h-screen bg-[#111417] text-[#f6f7f8] flex flex-col justify-between selection:bg-[#dd2222] selection:text-white font-sans">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="clip.studio"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-[#2b333c]"
          />
          <div>
            <div className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center">
              <span>clip</span>
              <span className="text-[#dd2222]">.studio</span>
            </div>
            <span className="hidden sm:block text-[11px] text-[#909cac] font-medium leading-tight">
              AI Video Clipping Engine
            </span>
          </div>
        </div>

        {/* Right Badges / Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#181d22] border border-[#f59e0b]/40 text-[#f59e0b] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
            <span>Maintenance Mode</span>
          </div>

          {isAuthorizedAdmin ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#241515] border border-[#731111] text-[#fca5a5] text-xs font-bold">
              <span>👑</span>
              <span className="text-[11px]">Administrator</span>
            </div>
          ) : (
            <button
              onClick={() => setShowAdminLoginModal(true)}
              className="text-xs text-[#909cac] hover:text-white px-3 py-1.5 rounded-lg border border-[#2b333c] bg-[#181d22] hover:bg-[#20272e] transition-colors cursor-pointer"
            >
              Admin Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 my-auto flex flex-col items-center text-center">
        {/* Clean Engineering Icon Tile (Solid background, no gradients, no fuzzy glows) */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#181d22] border border-[#2b333c] flex items-center justify-center mb-6 shadow-sm">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-[#f59e0b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        {/* Headlines */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-3">
          Under Scheduled Maintenance
        </h1>

        <p className="text-sm sm:text-base text-[#9fa9b5] max-w-xl mx-auto leading-relaxed mb-8">
          {maintenance.message || 'clip.studio is currently undergoing scheduled maintenance and system optimization. We will be back online shortly!'}
        </p>

        {/* System Status Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mb-6">
          <div className="p-4 rounded-xl bg-[#181d22] border border-[#2b333c] text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#909cac]">Video Processing</span>
              <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span>
            </div>
            <div className="text-sm font-bold text-white">Upgrading Pipelines</div>
          </div>

          <div className="p-4 rounded-xl bg-[#181d22] border border-[#2b333c] text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#909cac]">AI Architecture</span>
              <span className="w-2 h-2 rounded-full bg-[#2cb7d3]"></span>
            </div>
            <div className="text-sm font-bold text-white">openai/gpt-oss-120b</div>
          </div>

          <div className="p-4 rounded-xl bg-[#181d22] border border-[#2b333c] text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-[#909cac]">User Workspaces</span>
              <span className="w-2 h-2 rounded-full bg-[#22c55e]"></span>
            </div>
            <div className="text-sm font-bold text-white">Saved & Protected</div>
          </div>
        </div>

        {/* Live Status Auto-Reconnect Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181d22] border border-[#2b333c] text-xs text-[#909cac] mb-8 max-w-full">
          <span className="w-2 h-2 rounded-full bg-[#22c55e] shrink-0"></span>
          <span className="truncate">Live status monitor active. Reconnecting automatically when complete.</span>
        </div>

        {/* ============================================================ */}
        {/* ADMIN-ONLY MAINTENANCE CONTROL PANEL (Visible ONLY to Admin) */}
        {/* ============================================================ */}
        {isAuthorizedAdmin && (
          <div className="w-full max-w-2xl bg-[#181d22] border border-[#dd2222]/50 rounded-2xl p-4 sm:p-6 text-left shadow-lg">
            {/* Admin Header with Status Switch */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2b333c]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-[#2c1414] border border-[#731111] text-[#fca5a5] text-[10px] font-extrabold uppercase tracking-wider">
                    ADMIN CONTROL
                  </span>
                  <span className="text-sm font-bold text-white">Maintenance Switch</span>
                </div>
                <p className="text-xs text-[#909cac]">
                  Visible exclusively to authorized administrators.
                </p>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0">
                <span
                  className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    maintenance.enabled
                      ? 'bg-[#2c1414] text-[#fca5a5] border border-[#731111]'
                      : 'bg-[#16271c] text-[#86efac] border border-[#1e462a]'
                  }`}
                >
                  {maintenance.enabled ? 'ACTIVE' : 'OFF'}
                </span>
                <button
                  type="button"
                  disabled={isToggling}
                  onClick={() => handleToggle(!maintenance.enabled)}
                  className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#dd2222] disabled:opacity-50 ${
                    maintenance.enabled ? 'bg-[#dd2222]' : 'bg-[#2b333c]'
                  }`}
                  role="switch"
                  aria-checked={maintenance.enabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      maintenance.enabled ? 'translate-x-7' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Admin Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-4">
              <button
                type="button"
                disabled={isToggling}
                onClick={() => handleToggle(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isToggling ? (
                  <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                <span>Turn OFF & Restore Site</span>
              </button>

              <button
                type="button"
                onClick={() => setBypassMaintenance(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#22272e] hover:bg-[#2b323c] text-white text-xs sm:text-sm font-semibold border border-[#343b44] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4 text-[#dd2222]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Enter Studio as Admin (Bypass)</span>
              </button>
            </div>

            {/* Custom Message Announcement Form */}
            <form onSubmit={handleUpdateMessage} className="pt-4 mt-4 border-t border-[#2b333c] space-y-2">
              <label className="block text-xs font-semibold text-[#b9c0ca]">
                Visitor Announcement Message:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="Enter announcement message shown to regular visitors..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#111417] border border-[#2b333c] text-white text-xs sm:text-sm focus:outline-none focus:border-[#dd2222]"
                />
                <button
                  type="submit"
                  disabled={isUpdatingMsg}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#2b1414] hover:bg-[#381a1a] text-[#fca5a5] border border-[#731111] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {isUpdatingMsg ? 'Saving...' : 'Update Message'}
                </button>
              </div>
            </form>

            {/* Feedback Notifications */}
            {toggleSuccess && (
              <div className="mt-3 p-3 rounded-xl bg-[#14281b] border border-[#22c55e]/40 text-[#86efac] text-xs font-semibold">
                ✓ Maintenance configuration updated successfully!
              </div>
            )}
            {errorMessage && (
              <div className="mt-3 p-3 rounded-xl bg-[#2b1414] border border-[#dd2222]/40 text-[#fca5a5] text-xs font-semibold">
                ⚠️ {errorMessage}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 border-t border-[#22272e] flex flex-col sm:flex-row items-center justify-between text-xs text-[#6e7d91] gap-3">
        <div>
          © {new Date().getFullYear()} clip.studio. All user data and saved projects remain secure.
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
            Core Systems: Updating
          </span>
          {!isAuthorizedAdmin && (
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md rounded-2xl bg-[#181d22] border border-[#2b333c] p-6 shadow-2xl relative">
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
              Sign in with your administrator credentials to manage maintenance controls.
            </p>

            {loginError && (
              <div className="mb-4 p-3 rounded-lg bg-[#2b1414] border border-[#dd2222]/40 text-[#fca5a5] text-xs">
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
                  placeholder="admin@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111417] border border-[#2b333c] text-white text-sm focus:outline-none focus:border-[#dd2222]"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#111417] border border-[#2b333c] text-white text-sm focus:outline-none focus:border-[#dd2222]"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#dd2222] hover:bg-[#c81e1e] text-white font-bold text-sm transition-colors shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
