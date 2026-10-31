// components/MaintenanceGuard.jsx
'use client';

import { useMaintenance } from '@/contexts/MaintenanceContext';
import { useAuth } from '@/contexts/AuthContext';
import MaintenanceView from '@/components/MaintenanceView';

function AdminMaintenanceBanner() {
  const { maintenance, toggleMaintenance, setBypassMaintenance } = useMaintenance();

  return (
    <div className="bg-[#731111] border-b border-[#dd2222] px-4 py-2 text-white text-xs font-semibold flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#fca5a5] animate-ping shrink-0"></span>
        <span className="font-extrabold uppercase tracking-wide bg-[#dd2222] px-2 py-0.5 rounded text-[10px]">
          ADMIN PREVIEW
        </span>
        <span className="text-white">
          Maintenance Mode is currently <span className="underline font-bold text-amber-300">ACTIVE</span>. Regular visitors see only the maintenance page.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => toggleMaintenance(false)}
          className="px-3 py-1 rounded-lg bg-[#22c55e] hover:bg-[#1eb355] text-black font-extrabold text-xs transition-all cursor-pointer shadow"
        >
          ✓ Turn OFF Maintenance
        </button>
        <button
          onClick={() => setBypassMaintenance(false)}
          className="px-2.5 py-1 rounded-lg bg-[#282d33] hover:bg-[#39414b] text-gray-200 text-xs transition-all cursor-pointer"
        >
          Back to Maintenance View
        </button>
      </div>
    </div>
  );
}

export default function MaintenanceGuard({ children }) {
  const { maintenance, loading: maintenanceLoading, isAdmin, bypassMaintenance } = useMaintenance();
  const { loading: authLoading } = useAuth();

  // Initial loading state to prevent flash of content
  if (maintenanceLoading || authLoading) {
    return (
      <div className="min-h-screen bg-[#1d2125] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#dd2222] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-[#909cac] font-medium tracking-wide">Loading clip.studio...</span>
        </div>
      </div>
    );
  }

  // If maintenance is enabled:
  if (maintenance?.enabled) {
    // If not admin, or admin hasn't chosen to bypass:
    // Show ONLY the maintenance page, nothing else!
    if (!isAdmin || !bypassMaintenance) {
      return <MaintenanceView />;
    }
  }

  // If maintenance is off, or admin bypassed to preview app
  return (
    <>
      {maintenance?.enabled && isAdmin && <AdminMaintenanceBanner />}
      {children}
    </>
  );
}

