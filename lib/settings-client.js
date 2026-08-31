// lib/settings-client.js
'use client';

export const DEFAULT_SETTINGS = {
  active_ai_provider: 'groq',
  groq_api_key: '',
  gemini_api_key: '',
  mistral_api_key: '',
  openai_api_key: '',
  ffmpeg_path: '/usr/bin/ffmpeg',
  yt_dlp_path: '/usr/local/bin/yt-dlp',
  mongodb_uri: '',
};

const STORAGE_KEY = 'viralclips_settings_v1';

/**
 * Checks whether the application has the mandatory minimum configuration
 * (at least 1 AI API Key AND a MongoDB URI).
 */
export function isAppConfigured(settings) {
  if (!settings) return false;
  const hasMongo = Boolean(settings.mongodb_uri && settings.mongodb_uri.trim().length > 0);
  const hasAiKey = Boolean(
    (settings.groq_api_key && settings.groq_api_key.trim().length > 0) ||
    (settings.gemini_api_key && settings.gemini_api_key.trim().length > 0) ||
    (settings.mistral_api_key && settings.mistral_api_key.trim().length > 0) ||
    (settings.openai_api_key && settings.openai_api_key.trim().length > 0)
  );
  return hasMongo && hasAiKey;
}

/**
 * Retrieves the settings from localStorage, falling back to defaults.
 */
export function getStoredSettings() {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      ffmpeg_path: '/usr/bin/ffmpeg', // fixed to server default
      yt_dlp_path: '/usr/local/bin/yt-dlp', // fixed to server default
    };
  } catch (err) {
    console.warn('Failed to parse settings from localStorage:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Saves updated settings to localStorage and dispatches a custom event.
 */
export function saveStoredSettings(newSettings) {
  if (typeof window === 'undefined') return;

  try {
    const merged = {
      ...getStoredSettings(),
      ...newSettings,
      ffmpeg_path: '/usr/bin/ffmpeg', // fixed to server default
      yt_dlp_path: '/usr/local/bin/yt-dlp', // fixed to server default
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('viralclips:settings_updated', { detail: merged }));
    return merged;
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
    throw err;
  }
}

/**
 * Encodes settings to be sent via header.
 */
export function getSettingsHeader() {
  const settings = getStoredSettings();
  try {
    return encodeURIComponent(JSON.stringify(settings));
  } catch (e) {
    return '';
  }
}

/**
 * Drop-in wrapper around fetch() that injects the client's localStorage settings
 * via the 'x-app-settings' header.
 */
export async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('x-app-settings', getSettingsHeader());

  return fetch(url, {
    ...options,
    headers,
  });
}
