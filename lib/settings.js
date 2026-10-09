// lib/settings.js
// Client-side local storage manager for application configuration

export const DEFAULT_SETTINGS = {
  aiProvider: 'groq', // 'groq' | 'mistral' | 'gemini' | 'openai'
  groqKey: '',
  groqModel: 'llama-3.3-70b-versatile',
  mistralKey: '',
  mistralModel: 'mistral-small-latest',
  geminiKey: '',
  geminiModel: 'gemini-1.5-flash',
  openaiKey: '',
  openaiModel: 'gpt-4o-mini',
};

const STORAGE_KEY = 'shorts_app_settings';

/**
 * Checks whether an AI API key has been configured by the user.
 * Returns true if the active provider has a valid non-empty key,
 * or if any AI provider key has been configured.
 */
export function hasConfiguredApiKey(customSettings = null) {
  const settings = customSettings || getStoredSettings();
  if (!settings) return false;

  const currentProvider = settings.aiProvider || 'groq';
  if (currentProvider === 'groq' && settings.groqKey && settings.groqKey.trim().length > 0) return true;
  if (currentProvider === 'mistral' && settings.mistralKey && settings.mistralKey.trim().length > 0) return true;
  if (currentProvider === 'gemini' && settings.geminiKey && settings.geminiKey.trim().length > 0) return true;
  if (currentProvider === 'openai' && settings.openaiKey && settings.openaiKey.trim().length > 0) return true;

  return Boolean(
    (settings.groqKey && settings.groqKey.trim().length > 0) ||
    (settings.mistralKey && settings.mistralKey.trim().length > 0) ||
    (settings.geminiKey && settings.geminiKey.trim().length > 0) ||
    (settings.openaiKey && settings.openaiKey.trim().length > 0)
  );
}

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
    'x-ai-provider': settings.aiProvider || 'groq',
    'x-mistral-key': settings.mistralKey || '',
    'x-mistral-model': settings.mistralModel || 'mistral-small-latest',
    'x-gemini-key': settings.geminiKey || '',
    'x-gemini-model': settings.geminiModel || 'gemini-1.5-flash',
    'x-openai-key': settings.openaiKey || '',
    'x-openai-model': settings.openaiModel || 'gpt-4o-mini',
    'x-groq-key': settings.groqKey || '',
    'x-groq-model': settings.groqModel || 'llama-3.3-70b-versatile',
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

/**
 * Safely parse JSON from a fetch Response.
 * If the server returned an HTML error page (e.g. 504 Gateway Timeout, 502 Bad Gateway, 404, 500),
 * this extracts a meaningful, friendly error instead of throwing:
 * "Unexpected token '<', "<html> <h"... is not valid JSON".
 */
export async function safeParseJson(res) {
  let text = '';
  try {
    text = await res.text();
  } catch (err) {
    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}: ${res.statusText || 'Network error'}`);
    }
    return {};
  }

  if (!text || !text.trim()) {
    if (!res.ok) {
      throw new Error(`Server returned error ${res.status}: ${res.statusText || 'Empty response'}`);
    }
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (parseErr) {
    const lower = text.toLowerCase();
    if (lower.includes('504 gateway time-out') || lower.includes('504 gateway timeout') || res.status === 504) {
      throw new Error('Server timed out (504 Gateway Timeout). Video rendering or processing took longer than server allowed.');
    }
    if (lower.includes('502 bad gateway') || res.status === 502) {
      throw new Error('Server connection error (502 Bad Gateway). Please check if your backend process is running.');
    }
    if (lower.includes('503 service unavailable') || res.status === 503) {
      throw new Error('Service temporarily unavailable (503). Please try again shortly.');
    }
    if (lower.includes('404 not found') || res.status === 404) {
      throw new Error(`Endpoint not found (404): ${res.url || 'API route'}`);
    }
    if (!res.ok) {
      throw new Error(`Server returned error (${res.status} ${res.statusText || 'Error'}).`);
    }
    throw new Error('Server returned an unexpected non-JSON response. Please check server logs.');
  }
}
