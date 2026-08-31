// lib/settings-client.js
'use client';

export const DEFAULT_SETTINGS = {
  active_ai_provider: 'groq',
  groq_api_key: '',
  gemini_api_key: '',
  mistral_api_key: '',
  openai_api_key: '',
  ffmpeg_path: '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg',
  yt_dlp_path: '/opt/homebrew/bin/yt-dlp',
  mongodb_uri: 'mongodb://localhost:27017/shorts',
};

const STORAGE_KEY = 'viralclips_settings_v1';

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
