import fs from 'fs';

export function extractServerConfig(req) {
  const headers = req.headers;

  const mongodbUri = headers.get('x-mongodb-uri') || process.env.MONGODB_URI || 'mongodb://localhost:27017/shorts';
  
  let rawFfmpeg = headers.get('x-ffmpeg-path') || process.env.FFMPEG_PATH || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
  // If ffmpeg-full exists on macOS, prioritize it as it has libass subtitle burning enabled
  if (fs.existsSync('/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg')) {
    rawFfmpeg = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
  } else if (fs.existsSync('/opt/homebrew/Cellar/ffmpeg-full/9.0.1_1/bin/ffmpeg')) {
    rawFfmpeg = '/opt/homebrew/Cellar/ffmpeg-full/9.0.1_1/bin/ffmpeg';
  }
  const ffmpegPath = rawFfmpeg;
  const ytDlpPath = headers.get('x-yt-dlp-path') || process.env.YT_DLP_PATH || '/opt/homebrew/bin/yt-dlp';

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
