// lib/settings.js

function resolveDefaultFfmpegPath() {
  if (process.platform === 'linux') {
    return '/usr/bin/ffmpeg';
  }
  return '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
}

function resolveDefaultYtDlpPath() {
  if (process.platform === 'linux') {
    return '/usr/local/bin/yt-dlp';
  }
  return '/opt/homebrew/bin/yt-dlp';
}

/**
 * Extracts configuration settings sent exclusively by the client in headers or body.
 * No secret fallback is fetched from server .env files.
 */
export function extractSettings(req, body = null) {
  let clientSettings = {};

  // Check custom header from client's localStorage
  if (req && req.headers) {
    const rawHeader = req.headers.get ? req.headers.get('x-app-settings') : req.headers['x-app-settings'];
    if (rawHeader) {
      try {
        clientSettings = JSON.parse(decodeURIComponent(rawHeader));
      } catch (e) {
        try {
          clientSettings = JSON.parse(rawHeader);
        } catch (e2) {
          console.warn('Failed to parse x-app-settings header:', e2.message);
        }
      }
    }
  }

  // Check request body if provided
  if (body && body.settings) {
    clientSettings = { ...clientSettings, ...body.settings };
  }

  const serverDefaultFfmpeg = resolveDefaultFfmpegPath();
  const serverDefaultYtDlp = resolveDefaultYtDlpPath();

  return {
    active_ai_provider: clientSettings.active_ai_provider || 'groq',
    groq_api_key: (clientSettings.groq_api_key || '').trim(),
    gemini_api_key: (clientSettings.gemini_api_key || '').trim(),
    mistral_api_key: (clientSettings.mistral_api_key || '').trim(),
    openai_api_key: (clientSettings.openai_api_key || '').trim(),
    ffmpeg_path: (clientSettings.ffmpeg_path || '').trim() || serverDefaultFfmpeg,
    yt_dlp_path: (clientSettings.yt_dlp_path || '').trim() || serverDefaultYtDlp,
    mongodb_uri: (clientSettings.mongodb_uri || '').trim(),
    youtube_cookies: (clientSettings.youtube_cookies || '').trim(),
  };
}
