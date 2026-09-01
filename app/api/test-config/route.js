import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { runCommandLine } from '@/lib/video';

export async function POST(req) {
  try {
    const body = await req.json();
    const { type, mongodbUri, ffmpegPath, ytDlpPath, aiConfig } = body;

    // 1. Test MongoDB Connection
    if (type === 'mongodb') {
      const uri = mongodbUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/shorts';
      if (!uri) {
        return NextResponse.json({ success: false, error: 'No MongoDB URI provided' }, { status: 400 });
      }

      // Create an isolated connection for testing
      const testConn = await mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 5000,
      }).asPromise();

      await testConn.close();
      return NextResponse.json({
        success: true,
        message: 'Successfully connected to MongoDB database!'
      });
    }

    // 2. Test FFmpeg Path
    if (type === 'ffmpeg') {
      const targetPath = ffmpegPath || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
      try {
        const output = await runCommandLine(targetPath, ['-version']);
        const firstLine = output.split('\n')[0];
        return NextResponse.json({
          success: true,
          message: `FFmpeg verified: ${firstLine}`
        });
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: `FFmpeg executable not found or failed at path "${targetPath}": ${err.message}`
        }, { status: 400 });
      }
    }

    // 3. Test YT-DLP Path
    if (type === 'yt_dlp') {
      const targetPath = ytDlpPath || '/opt/homebrew/bin/yt-dlp';
      try {
        const output = await runCommandLine(targetPath, ['--version']);
        return NextResponse.json({
          success: true,
          message: `yt-dlp verified (version: ${output.trim()})`
        });
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: `yt-dlp executable not found or failed at path "${targetPath}": ${err.message}`
        }, { status: 400 });
      }
    }

    // 4. Test AI Provider
    if (type === 'ai') {
      const provider = aiConfig?.provider || 'mistral';
      const key = aiConfig?.key;
      const model = aiConfig?.model;

      if (!key) {
        return NextResponse.json({ success: false, error: `Please enter an API key for ${provider}` }, { status: 400 });
      }

      if (provider === 'groq') {
        const targetModel = model || 'openai/gpt-oss-120b';
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: 'user', content: 'Reply with "OK"' }],
            max_tokens: 5
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({ success: false, error: `Groq error (${res.status}): ${errText}` }, { status: 400 });
        }
        return NextResponse.json({ success: true, message: `Groq connected successfully (${targetModel})!` });
      }

      if (provider === 'mistral') {
        const targetModel = model || 'mistral-small-latest';
        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: 'user', content: 'Reply with "OK"' }],
            max_tokens: 5
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({ success: false, error: `Mistral error (${res.status}): ${errText}` }, { status: 400 });
        }
        return NextResponse.json({ success: true, message: `Mistral connected successfully (${targetModel})!` });
      }

      if (provider === 'gemini') {
        const targetModel = model || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Reply with "OK"' }] }]
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({ success: false, error: `Gemini error (${res.status}): ${errText}` }, { status: 400 });
        }
        return NextResponse.json({ success: true, message: `Gemini connected successfully (${targetModel})!` });
      }

      if (provider === 'openai') {
        const targetModel = model || 'gpt-4o-mini';
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: 'user', content: 'Reply with "OK"' }],
            max_tokens: 5
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json({ success: false, error: `OpenAI error (${res.status}): ${errText}` }, { status: 400 });
        }
        return NextResponse.json({ success: true, message: `OpenAI connected successfully (${targetModel})!` });
      }

      return NextResponse.json({ success: false, error: `Unknown provider: ${provider}` }, { status: 400 });
    }

    return NextResponse.json({ success: false, error: 'Invalid test type specified' }, { status: 400 });
  } catch (error) {
    console.error('API TEST-CONFIG: Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 });
  }
}
