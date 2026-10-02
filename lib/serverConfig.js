import fs from 'fs';

export function extractServerConfig(req) {
  const headers = req.headers;

  // Database URI is strictly from environment variable
  const mongodbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shorts';
  
  // Video binaries are strictly from environment variables
  let rawFfmpeg = process.env.FFMPEG_PATH;
  if (!rawFfmpeg) {
    if (fs.existsSync('/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg')) {
      rawFfmpeg = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
    } else if (fs.existsSync('/opt/homebrew/Cellar/ffmpeg-full/9.0.1_1/bin/ffmpeg')) {
      rawFfmpeg = '/opt/homebrew/Cellar/ffmpeg-full/9.0.1_1/bin/ffmpeg';
    } else if (fs.existsSync('/usr/bin/ffmpeg')) {
      rawFfmpeg = '/usr/bin/ffmpeg';
    } else {
      rawFfmpeg = 'ffmpeg';
    }
  }
  const ffmpegPath = rawFfmpeg;
  const ytDlpPath = process.env.YT_DLP_PATH || (fs.existsSync('/usr/local/bin/yt-dlp') ? '/usr/local/bin/yt-dlp' : (fs.existsSync('/opt/homebrew/bin/yt-dlp') ? '/opt/homebrew/bin/yt-dlp' : 'yt-dlp'));

  const aiConfig = {
    provider: headers.get('x-ai-provider') || 'mistral',
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
