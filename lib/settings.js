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
 * Extracts configuration settings sent by client in headers or body,
 * falling back to server-installed binaries and defaults.
 */
export function extractSettings(req, body = null) {
  let clientSettings = {};

  // Check custom header
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
    groq_api_key: clientSettings.groq_api_key?.trim() || process.env.GROQ_API_KEY || '',
    gemini_api_key: clientSettings.gemini_api_key?.trim() || process.env.GEMINI_API_KEY || '',
    mistral_api_key: clientSettings.mistral_api_key?.trim() || process.env.MISTRAL_API_KEY || '',
    openai_api_key: clientSettings.openai_api_key?.trim() || process.env.OPENAI_API_KEY || '',
    ffmpeg_path: clientSettings.ffmpeg_path?.trim() || process.env.FFMPEG_PATH || serverDefaultFfmpeg,
    yt_dlp_path: clientSettings.yt_dlp_path?.trim() || process.env.YT_DLP_PATH || serverDefaultYtDlp,
    mongodb_uri: clientSettings.mongodb_uri?.trim() || process.env.MONGODB_URI || 'mongodb://localhost:27017/shorts',
  };
}
