// contexts/MaintenanceContext.jsx
'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const MaintenanceContext = createContext({
  maintenance: {
    enabled: false,
    message: '',
    estimatedTime: 'Soon',
    updatedAt: null,
    updatedBy: '',
  },
  loading: true,
  isAdmin: false,
  bypassMaintenance: false,
  setBypassMaintenance: () => {},
  toggleMaintenance: async () => {},
  refreshMaintenance: async () => {},
});

export function MaintenanceProvider({ children }) {
  const { user } = useAuth();
  const [maintenance, setMaintenance] = useState({
    enabled: false,
    message: '',
    estimatedTime: 'Soon',
    updatedAt: null,
    updatedBy: '',
  });
  const [loading, setLoading] = useState(true);
  const [bypassMaintenance, setBypassMaintenance] = useState(false);

  // Check if active user is admin (specifically nitinbhagatxyz@gmail.com or role admin)
  const isAdmin = Boolean(
    (user?.email && user.email.toLowerCase().trim() === 'nitinbhagatxyz@gmail.com') ||
    user?.isAdmin ||
    user?.role === 'admin'
  );

  const refreshMaintenance = useCallback(async () => {
    try {
      const res = await fetch('/api/maintenance', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (res.ok) {
        const data = await res.json();
        setMaintenance({
          enabled: Boolean(data.enabled),
          message: data.message || '',
          estimatedTime: data.estimatedTime || 'Soon',
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy || '',
        });
      }
    } catch (err) {
      console.warn('Maintenance check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMaintenance();

    // Check status periodically every 8 seconds so clients update dynamically
    const interval = setInterval(() => {
      refreshMaintenance();
    }, 8000);

    return () => clearInterval(interval);
  }, [refreshMaintenance]);

  const toggleMaintenance = async (nextEnabled, customMessage, estimatedTime) => {
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: nextEnabled,
          message: customMessage !== undefined ? customMessage : maintenance.message,
          estimatedTime: estimatedTime !== undefined ? estimatedTime : maintenance.estimatedTime,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update maintenance mode');
      }

      setMaintenance((prev) => ({
        ...prev,
        enabled: Boolean(nextEnabled),
        message: data.maintenance?.message || prev.message,
        estimatedTime: data.maintenance?.estimatedTime || prev.estimatedTime,
        updatedAt: data.maintenance?.updatedAt || new Date().toISOString(),
        updatedBy: data.maintenance?.updatedBy || 'admin',
      }));

      return data;
    } catch (err) {
      console.error('toggleMaintenance error:', err);
      throw err;
    }
  };

  return (
    <MaintenanceContext.Provider
      value={{
        maintenance,
        loading,
        isAdmin,
        bypassMaintenance,
        setBypassMaintenance,
        toggleMaintenance,
        refreshMaintenance,
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
}

