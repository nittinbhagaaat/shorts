import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { spawn } from 'child_process';
import path from 'path';

function testCommand(command, args = ['--version']) {
  return new Promise((resolve) => {
    try {
      // If command contains spaces like "python3 -m yt_dlp", parse binary and args
      const parts = command.split(' ');
      const bin = parts[0];
      const cmdArgs = parts.length > 1 ? [...parts.slice(1), ...args] : args;

      const proc = spawn(bin, cmdArgs);
      let output = '';
      let errorOutput = '';

      proc.stdout.on('data', (d) => { output += d.toString(); });
      proc.stderr.on('data', (d) => { errorOutput += d.toString(); });

      const timeout = setTimeout(() => {
        try { proc.kill(); } catch (e) {}
        resolve({ ok: false, message: 'Execution timed out' });
      }, 4000);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0 || output.length > 0) {
          const firstLine = (output || errorOutput).split('\n')[0].trim();
          resolve({ ok: true, version: firstLine, resolvedPath: command });
        } else {
          resolve({ ok: false, message: errorOutput || `Exited with code ${code}` });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ ok: false, message: err.message });
      });
    } catch (err) {
      resolve({ ok: false, message: err.message });
    }
  });
}

async function resolveAndTestBinary(userPath, candidates, args = ['--version']) {
  // 1. Try user path first if provided
  if (userPath) {
    const directResult = await testCommand(userPath.trim(), args);
    if (directResult.ok) {
      return directResult;
    }
  }

  // 2. Try candidate fallback paths on the server
  for (const candidate of candidates) {
    if (candidate !== userPath) {
      const fallbackResult = await testCommand(candidate, args);
      if (fallbackResult.ok) {
        return {
          ...fallbackResult,
          message: `Found at server location: ${candidate}`
        };
      }
    }
  }

  return {
    ok: false,
    message: userPath ? `File does not exist at: ${userPath}` : 'Path not configured'
  };
}

async function testAIKey(provider, key) {
  if (!key) return { ok: false, message: 'No API key provided' };

  try {
    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`
        }
      });
      if (res.ok) return { ok: true, message: 'Groq API Key valid! (Free tier active)' };
      const err = await res.json().catch(() => ({}));
      return { ok: false, message: err.error?.message || res.statusText };
    }

    if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
        method: 'GET',
      });
      if (res.ok) return { ok: true, message: 'Gemini API Key valid!' };
      const err = await res.json().catch(() => ({}));
      return { ok: false, message: err.error?.message || res.statusText };
    }

    if (provider === 'mistral') {
      const res = await fetch('https://api.mistral.ai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`
        }
      });
      if (res.ok) return { ok: true, message: 'Mistral API Key valid! (Free Tier active)' };
      const err = await res.json().catch(() => ({}));
      return { ok: false, message: err.message || err.error?.message || res.statusText };
    }

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`
        }
      });
      if (res.ok) return { ok: true, message: 'OpenAI API Key valid!' };
      const err = await res.json().catch(() => ({}));
      return { ok: false, message: err.error?.message || res.statusText };
    }

    return { ok: false, message: 'Unknown provider' };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { mongodb_uri, ffmpeg_path, yt_dlp_path, active_ai_provider, groq_api_key, gemini_api_key, mistral_api_key, openai_api_key } = body;

    const results = {
      mongodb: { ok: false, message: '' },
      ffmpeg: { ok: false, message: '', version: '' },
      yt_dlp: { ok: false, message: '', version: '' },
      ai: { ok: false, message: '', provider: active_ai_provider || 'groq' }
    };

    // 1. Test MongoDB
    if (mongodb_uri) {
      try {
        const testConn = await mongoose.createConnection(mongodb_uri, {
          serverSelectionTimeoutMS: 3000,
          bufferCommands: false
        }).asPromise();
        await testConn.close();
        results.mongodb = { ok: true, message: 'Connected successfully to MongoDB!' };
      } catch (err) {
        results.mongodb = { ok: false, message: err.message };
      }
    } else {
      results.mongodb = { ok: false, message: 'MongoDB URI not provided' };
    }

    // 2. Test FFmpeg with server candidates fallback
    const ffmpegCandidates = [
      '/usr/bin/ffmpeg',
      '/usr/local/bin/ffmpeg',
      'ffmpeg',
      '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg',
      '/opt/homebrew/bin/ffmpeg'
    ];
    results.ffmpeg = await resolveAndTestBinary(ffmpeg_path, ffmpegCandidates, ['-version']);

    // 3. Test yt-dlp with bundled, system, pip, and candidate paths
    const bundledYtDlp = path.join(process.cwd(), 'bin', 'yt-dlp');
    const ytDlpCandidates = [
      bundledYtDlp,
      '/usr/local/bin/yt-dlp',
      '/usr/bin/yt-dlp',
      'yt-dlp',
      'python3 -m yt_dlp',
      '/opt/homebrew/bin/yt-dlp'
    ];
    results.yt_dlp = await resolveAndTestBinary(yt_dlp_path, ytDlpCandidates, ['--version']);

    // 4. Test Active AI Key
    const keyMap = {
      groq: groq_api_key,
      gemini: gemini_api_key,
      mistral: mistral_api_key,
      openai: openai_api_key
    };
    const activeKey = keyMap[active_ai_provider || 'groq'];
    results.ai = await testAIKey(active_ai_provider || 'groq', activeKey);
    results.ai.provider = active_ai_provider || 'groq';

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
