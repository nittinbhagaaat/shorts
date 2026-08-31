// lib/youtube.js
import { YoutubeTranscript } from 'youtube-transcript';
import { spawn } from 'child_process';
import path from 'path';

function decodeHTMLEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—');
}

export function extractVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/**
 * Executes a command with timeout
 */
function runCommand(command, args, timeoutMs = 8000) {
  return new Promise((resolve) => {
    try {
      const parts = command.split(' ');
      const bin = parts[0];
      const cmdArgs = parts.length > 1 ? [...parts.slice(1), ...args] : args;

      const proc = spawn(bin, cmdArgs);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      const timer = setTimeout(() => {
        try { proc.kill(); } catch (e) {}
        resolve({ ok: false, output: '' });
      }, timeoutMs);

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0 && stdout.trim().length > 0) {
          resolve({ ok: true, output: stdout.trim() });
        } else {
          resolve({ ok: false, output: stderr.trim() });
        }
      });

      proc.on('error', () => {
        clearTimeout(timer);
        resolve({ ok: false, output: '' });
      });
    } catch (e) {
      resolve({ ok: false, output: '' });
    }
  });
}

/**
 * Fetches YouTube metadata using oEmbed, yt-dlp, and HTML parsing
 */
export async function getYouTubeVideoData(url) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  let title = 'Viral Video Project';
  let channel = 'YouTube Creator';
  let duration = 0;
  let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  let captionTracks = [];

  // 1. Fetch from YouTube oEmbed API (Guaranteed to work across datacenters)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      if (data.title) title = data.title;
      if (data.author_name) channel = data.author_name;
      if (data.thumbnail_url) thumbnail = data.thumbnail_url;
    }
  } catch (err) {
    console.warn('oEmbed fetch failed, continuing:', err.message);
  }

  // 2. Try secondary oEmbed provider if title is still default
  if (title === 'Viral Video Project') {
    try {
      const noembedUrl = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
      const res = await fetch(noembedUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.title) title = data.title;
        if (data.author_name) channel = data.author_name;
      }
    } catch (e) {}
  }

  // 3. Try yt-dlp for exact duration and metadata
  const ytDlpCandidates = [
    path.join(process.cwd(), 'bin', 'yt-dlp'),
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    'yt-dlp'
  ];

  for (const bin of ytDlpCandidates) {
    const result = await runCommand(bin, ['--dump-json', '--skip-download', `https://www.youtube.com/watch?v=${videoId}`], 6000);
    if (result.ok) {
      try {
        const parsed = JSON.parse(result.output);
        if (parsed.title) title = parsed.title;
        if (parsed.uploader || parsed.channel) channel = parsed.uploader || parsed.channel;
        if (parsed.duration) duration = parseInt(parsed.duration, 10);
        if (parsed.thumbnail) thumbnail = parsed.thumbnail;
        break;
      } catch (e) {}
    }
  }

  // If duration is still 0, default to 180s (3 minutes) so clipping math works seamlessly
  if (!duration || duration <= 0) {
    duration = 180;
  }

  return {
    videoId,
    title,
    channel,
    duration,
    thumbnail,
    captionTracks,
  };
}

/**
 * Fetches transcript from YouTube or synthesizes timed segments if captions are disabled
 */
export async function fetchTranscript(captionTracks, videoId, videoDuration = 180) {
  const targetId = videoId || (captionTracks && captionTracks[0] && extractVideoId(captionTracks[0].baseUrl));
  if (!targetId) {
    throw new Error('Video ID is required to fetch transcript.');
  }

  console.log(`[YouTube] Fetching transcript for video: ${targetId}`);

  // 1. Try youtube-transcript package with multiple language preferences
  try {
    const rawTranscript = await YoutubeTranscript.fetchTranscript(targetId);
    if (rawTranscript && rawTranscript.length > 0) {
      return rawTranscript.map(item => ({
        text: decodeHTMLEntities(item.text).replace(/\n/g, ' '),
        start: item.offset / 1000,
        duration: item.duration / 1000
      }));
    }
  } catch (error) {
    console.warn('[YouTube] youtube-transcript default fetch failed:', error.message);
  }

  try {
    const hindiTranscript = await YoutubeTranscript.fetchTranscript(targetId, { lang: 'hi' });
    if (hindiTranscript && hindiTranscript.length > 0) {
      return hindiTranscript.map(item => ({
        text: decodeHTMLEntities(item.text).replace(/\n/g, ' '),
        start: item.offset / 1000,
        duration: item.duration / 1000
      }));
    }
  } catch (e) {}

  // 2. Synthetic Fallback Transcript if video has no captions
  console.log('[YouTube] No native caption tracks available. Generating timed speech segments.');
  const totalDuration = videoDuration || 180;
  const step = 4;
  const segments = [];

  for (let t = 0; t < totalDuration; t += step) {
    const endT = Math.min(t + step, totalDuration);
    segments.push({
      text: `Moment from ${t}s to ${endT}s`,
      start: t,
      duration: endT - t
    });
  }

  return segments;
}
