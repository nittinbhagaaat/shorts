// lib/maintenance.js
import dbConnect from './db.js';
import SystemSetting from '@/models/SystemSetting';
import { ADMIN_EMAIL, getAuthUser, isUserAdmin } from './auth';

export const DEFAULT_MAINTENANCE_MESSAGE =
  'clip.studio is currently undergoing scheduled maintenance and system optimization. We will be back online shortly!';

let memoryMaintenanceCache = {
  data: {
    enabled: false,
    message: DEFAULT_MAINTENANCE_MESSAGE,
    estimatedTime: 'Soon',
    updatedBy: 'system',
    updatedAt: null,
  },
  cachedAt: 0,
};

/**
 * Checks whether an incoming HTTP request should be blocked due to active maintenance mode.
 * Admins are NEVER blocked.
 */
export async function checkMaintenanceBlock(req) {
  const status = await getMaintenanceStatus();
  if (!status || !status.enabled) return null;

  const authUser = await getAuthUser(req);
  if (isUserAdmin(authUser)) return null;

  return {
    blocked: true,
    message: status.message || DEFAULT_MAINTENANCE_MESSAGE,
  };
}

/**
 * Retrieves the current maintenance status from MongoDB with caching.
 */
export async function getMaintenanceStatus(customUri = null) {
  const now = Date.now();
  if (memoryMaintenanceCache.cachedAt && now - memoryMaintenanceCache.cachedAt < 2000) {
    return memoryMaintenanceCache.data;
  }

  try {
    await dbConnect(customUri);
    const setting = await SystemSetting.findOne({ key: 'maintenance' }).lean();
    if (setting && setting.value) {
      const data = {
        enabled: Boolean(setting.value.enabled),
        message: setting.value.message || DEFAULT_MAINTENANCE_MESSAGE,
        estimatedTime: setting.value.estimatedTime || 'Soon',
        updatedBy: setting.value.updatedBy || setting.updatedBy || 'system',
        updatedAt: setting.updatedAt || setting.value.updatedAt || new Date(),
      };
      memoryMaintenanceCache = { data, cachedAt: now };
      return data;
    }
  } catch (err) {
    console.warn('[maintenance] Error reading maintenance setting:', err.message);
  }

  return memoryMaintenanceCache.data;
}

/**
 * Updates the maintenance status in MongoDB.
 * Strictly intended for admin use.
 */
export async function setMaintenanceStatus({ enabled, message, estimatedTime, updatedBy }, customUri = null) {
  await dbConnect(customUri);
  const now = new Date();
  const value = {
    enabled: Boolean(enabled),
    message: (message && message.trim()) || DEFAULT_MAINTENANCE_MESSAGE,
    estimatedTime: (estimatedTime && estimatedTime.trim()) || 'Soon',
    updatedBy: updatedBy || 'admin',
    updatedAt: now,
  };

  await SystemSetting.findOneAndUpdate(
    { key: 'maintenance' },
    { value, updatedAt: now, updatedBy: value.updatedBy },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  memoryMaintenanceCache = { data: value, cachedAt: Date.now() };
  return value;
}
