// lib/settings.js
// Client-side local storage manager for application configuration

export const DEFAULT_SETTINGS = {
  aiProvider: 'mistral', // 'mistral' | 'gemini' | 'openai' | 'groq'
  mistralKey: '',
  mistralModel: 'mistral-small-latest',
  geminiKey: '',
  geminiModel: 'gemini-1.5-flash',
  openaiKey: '',
  openaiModel: 'gpt-4o-mini',
  groqKey: '',
  groqModel: 'openai/gpt-oss-120b',
  ffmpegPath: '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg',
  ytDlpPath: '/opt/homebrew/bin/yt-dlp',
  mongodbUri: 'mongodb://localhost:27017/shorts',
  enableSubtitlesDefault: true,
};

const STORAGE_KEY = 'shorts_app_settings';

/**
 * Retrieves the stored settings from localStorage.
 * Falls back gracefully to default settings.
 */
export function getStoredSettings() {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.warn('Failed to parse settings from localStorage:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Saves updated settings into localStorage and emits an update event.
 */
export function saveStoredSettings(newSettings) {
  if (typeof window === 'undefined') return;

  try {
    const merged = { ...DEFAULT_SETTINGS, ...newSettings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    
    // Dispatch a window event so all open components can sync immediately
    window.dispatchEvent(new CustomEvent('shorts_settings_updated', { detail: merged }));
    return merged;
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
    throw err;
  }
}

/**
 * Builds HTTP request headers with the current client settings.
 */
export function getApiHeaders(customSettings = null) {
  const settings = customSettings || getStoredSettings();

  return {
    'x-mongodb-uri': settings.mongodbUri || '',
    'x-ai-provider': settings.aiProvider || 'mistral',
    'x-mistral-key': settings.mistralKey || '',
    'x-mistral-model': settings.mistralModel || 'mistral-small-latest',
    'x-gemini-key': settings.geminiKey || '',
    'x-gemini-model': settings.geminiModel || 'gemini-1.5-flash',
    'x-openai-key': settings.openaiKey || '',
    'x-openai-model': settings.openaiModel || 'gpt-4o-mini',
    'x-groq-key': settings.groqKey || '',
    'x-groq-model': settings.groqModel || 'openai/gpt-oss-120b',
    'x-ffmpeg-path': settings.ffmpegPath || '',
    'x-yt-dlp-path': settings.ytDlpPath || '',
  };
}

/**
 * Helper to fetch with automatically attached client configuration headers.
 */
export async function fetchWithSettings(url, options = {}) {
  const headers = {
    ...getApiHeaders(),
    ...(options.headers || {}),
  };

  return fetch(url, {
    ...options,
    headers,
  });
}
