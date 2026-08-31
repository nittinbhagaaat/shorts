import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { spawn } from 'child_process';
import fs from 'fs';

function runVersionCheck(executablePath, args = ['--version']) {
  return new Promise((resolve) => {
    if (!executablePath || !fs.existsSync(executablePath)) {
      return resolve({
        ok: false,
        message: `File does not exist at path: ${executablePath}`
      });
    }

    try {
      const proc = spawn(executablePath, args);
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
          resolve({ ok: true, version: firstLine });
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

async function testAIKey(provider, key) {
  if (!key) return { ok: false, message: 'No API key provided' };

  try {
    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'Say OK' }],
          max_tokens: 5
        })
      });
      if (res.ok) return { ok: true, message: 'Groq API Key valid!' };
      const err = await res.json();
      return { ok: false, message: err.error?.message || res.statusText };
    }

    if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say OK' }] }]
        })
      });
      if (res.ok) return { ok: true, message: 'Gemini API Key valid!' };
      const err = await res.json();
      return { ok: false, message: err.error?.message || res.statusText };
    }

    if (provider === 'mistral') {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [{ role: 'user', content: 'Say OK' }],
          max_tokens: 5
        })
      });
      if (res.ok) return { ok: true, message: 'Mistral API Key valid!' };
      const err = await res.json();
      return { ok: false, message: err.message || res.statusText };
    }

    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Say OK' }],
          max_tokens: 5
        })
      });
      if (res.ok) return { ok: true, message: 'OpenAI API Key valid!' };
      const err = await res.json();
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

    // 2. Test FFmpeg
    if (ffmpeg_path) {
      const ffmpegCheck = await runVersionCheck(ffmpeg_path, ['-version']);
      results.ffmpeg = ffmpegCheck;
    } else {
      results.ffmpeg = { ok: false, message: 'FFmpeg path not provided' };
    }

    // 3. Test yt-dlp
    if (yt_dlp_path) {
      const ytDlpCheck = await runVersionCheck(yt_dlp_path, ['--version']);
      results.yt_dlp = ytDlpCheck;
    } else {
      results.yt_dlp = { ok: false, message: 'yt-dlp path not provided' };
    }

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
