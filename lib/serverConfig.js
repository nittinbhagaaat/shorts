import fs from 'fs';

function resolveBinary(envVar, candidatePaths) {
  const envVal = process.env[envVar];
  if (envVal) {
    if (!envVal.startsWith('/') || fs.existsSync(/*turbopackIgnore: true*/ envVal)) {
      return envVal;
    }
  }
  for (const p of candidatePaths) {
    if (p.startsWith('/') && fs.existsSync(/*turbopackIgnore: true*/ p)) {
      return p;
    }
  }
  return candidatePaths[candidatePaths.length - 1];
}

export function extractServerConfig(req) {
  const headers = req.headers;

  // Database URI is strictly from environment variable
  const mongodbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shorts';
  
  // Video binaries resolved for both Linux (Ubuntu) and macOS
  const ffmpegPath = resolveBinary('FFMPEG_PATH', [
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    'ffmpeg'
  ]);

  const ytDlpPath = resolveBinary('YT_DLP_PATH', [
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    '/opt/homebrew/bin/yt-dlp',
    'yt-dlp'
  ]);

  const aiConfig = {
    provider: headers.get('x-ai-provider') || 'groq',
    mistralKey: headers.get('x-mistral-key') || process.env.MISTRAL_API_KEY || '',
    mistralModel: headers.get('x-mistral-model') || 'mistral-large-latest',
    geminiKey: headers.get('x-gemini-key') || process.env.GEMINI_API_KEY || '',
    geminiModel: headers.get('x-gemini-model') || 'gemini-1.5-flash',
    openaiKey: headers.get('x-openai-key') || process.env.OPENAI_API_KEY || '',
    openaiModel: headers.get('x-openai-model') || 'gpt-4o-mini',
    groqKey: headers.get('x-groq-key') || process.env.GROQ_API_KEY || '',
    groqModel: headers.get('x-groq-model') || 'llama-3.3-70b-versatile',
  };

  return {
    mongodbUri,
    ffmpegPath,
    ytDlpPath,
    aiConfig,
  };
}
