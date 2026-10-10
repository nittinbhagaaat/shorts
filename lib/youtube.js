import { YoutubeTranscript } from 'youtube-transcript';
import { runCommandLine } from './video.js';
import fs from 'fs';
import path from 'path';

function resolveYtDlp(customPath) {
  if (customPath) {
    if (!customPath.startsWith('/') || fs.existsSync(/*turbopackIgnore: true*/ customPath)) return customPath;
  }
  if (process.env.YT_DLP_PATH) {
    const val = process.env.YT_DLP_PATH;
    if (!val.startsWith('/') || fs.existsSync(/*turbopackIgnore: true*/ val)) return val;
  }
  const candidates = ['/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp', '/opt/homebrew/bin/yt-dlp', 'yt-dlp'];
  for (const c of candidates) {
    if (c.startsWith('/') && fs.existsSync(/*turbopackIgnore: true*/ c)) return c;
  }
  return 'yt-dlp';
}

// A simple HTML entity decoder to avoid installing extra npm packages if we can avoid it.
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
    .replace(/&mdash;/g, '—')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

export function extractVideoId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function extractPlayerResponse(html) {
  const marker = 'ytInitialPlayerResponse';
  const index = html.indexOf(marker);
  if (index === -1) return null;
  
  // Find the first opening brace after the marker
  let start = html.indexOf('{', index);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  let quoteChar = null;
  let end = start;

  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"' || char === "'") {
      if (!inString) {
        inString = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inString = false;
        quoteChar = null;
      }
      continue;
    }
    if (inString) continue;

    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  const jsonStr = html.substring(start, end);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse ytInitialPlayerResponse JSON:', e.message);
    return null;
  }
}

function parseVttToTranscript(vtt) {
  if (!vtt) return [];
  const lines = vtt.split(/\r?\n/);
  const segments = [];
  const timeRegex = /(\d{2}):(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(timeRegex);
    if (match) {
      const start = parseInt(match[1], 10) * 3600 + parseInt(match[2], 10) * 60 + parseInt(match[3], 10) + parseInt(match[4], 10) / 1000;
      const end = parseInt(match[5], 10) * 3600 + parseInt(match[6], 10) * 60 + parseInt(match[7], 10) + parseInt(match[8], 10) / 1000;
      let text = '';
      i++;
      while (i < lines.length && lines[i].trim() && !lines[i].includes('-->')) {
        text += ' ' + lines[i].replace(/<[^>]+>/g, '').trim();
        i++;
      }
      text = decodeHTMLEntities(text).trim();
      if (text) {
        segments.push({
          text,
          start,
          duration: Math.max(1, end - start)
        });
      }
    }
  }
  return segments;
}

export async function getYouTubeVideoData(url, customYtDlpPath) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  let title = '';
  let channel = '';
  let thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  let duration = 0;
  let captionTracks = [];

  // 1. YouTube official oEmbed API (Resilient against bot checks on VPS datacenter IPs)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedRes = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(5000)
    });
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      if (oembedData.title) title = decodeHTMLEntities(oembedData.title);
      if (oembedData.author_name) channel = decodeHTMLEntities(oembedData.author_name);
      if (oembedData.thumbnail_url) thumbnail = oembedData.thumbnail_url;
      console.log(`YOUTUBE META: Retrieved via oEmbed: "${title}" by "${channel}"`);
    }
  } catch (oembedErr) {
    console.warn('YOUTUBE META: oEmbed query failed:', oembedErr.message);
  }

  // 2. yt-dlp metadata extraction (uses local binary on server)
  const resolvedYtDlp = resolveYtDlp(customYtDlpPath);
  const cookiesPath = process.env.YOUTUBE_COOKIES_PATH || path.join(process.cwd(), 'cookies.txt');
  const hasCookies = fs.existsSync(/*turbopackIgnore: true*/ cookiesPath) && fs.statSync(/*turbopackIgnore: true*/ cookiesPath).size > 10;
  const cookieFlags = hasCookies ? ['--cookies', cookiesPath] : [];

  try {
    console.log(`YOUTUBE META: Querying yt-dlp (${resolvedYtDlp}) for video ${videoId}...`);
    const metaOutput = await runCommandLine(resolvedYtDlp, [
      '--no-playlist',
      '--no-warnings',
      '--extractor-args', 'youtube:player_client=visionos,android,ios',
      ...cookieFlags,
      '--print', '%(title)s\t%(uploader)s\t%(duration)s\t%(thumbnail)s',
      `https://www.youtube.com/watch?v=${videoId}`
    ]);
    const parts = metaOutput.trim().split('\t');
    if (parts[0] && (!title || title === 'Untitled Video')) title = parts[0].trim();
    if (parts[1] && (!channel || channel === 'Unknown Channel')) channel = parts[1].trim();
    if (parts[2]) {
      const parsedDur = parseInt(parts[2].trim(), 10);
      if (!isNaN(parsedDur) && parsedDur > 0) duration = parsedDur;
    }
    if (parts[3] && parts[3].trim()) thumbnail = parts[3].trim();
    console.log(`YOUTUBE META: yt-dlp returned: duration=${duration}s, title="${title}"`);
  } catch (ytdlpErr) {
    console.warn('YOUTUBE META: yt-dlp metadata query failed:', ytdlpErr.message);
  }

  // 3. Fallback: Parse watch page HTML
  if (duration === 0 || !title) {
    try {
      const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(6000)
      });
      if (response.ok) {
        const html = await response.text();
        const playerResponse = extractPlayerResponse(html);
        if (playerResponse?.videoDetails) {
          if (!title) title = playerResponse.videoDetails.title || '';
          if (!channel) channel = playerResponse.videoDetails.author || '';
          const parsedDur = parseInt(playerResponse.videoDetails.lengthSeconds || '0', 10);
          if (parsedDur > 0 && duration === 0) duration = parsedDur;
          if (playerResponse.videoDetails.thumbnail?.thumbnails?.[0]?.url && !thumbnail) {
            thumbnail = playerResponse.videoDetails.thumbnail.thumbnails[0].url;
          }
        }
        if (playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
          captionTracks = playerResponse.captions.playerCaptionsTracklistRenderer.captionTracks;
        }
      }
    } catch (htmlErr) {
      console.warn('YOUTUBE META: Direct watch page parse failed:', htmlErr.message);
    }
  }

  // Fallbacks: Ensure values are never empty or 0
  title = title || 'YouTube Video Highlight';
  channel = channel || 'Creator';
  duration = Math.max(180, Number(duration) || 600);

  return {
    videoId,
    title,
    channel,
    duration,
    thumbnail,
    captionTracks,
  };
}

export async function fetchTranscript(captionTracks, videoId, customYtDlpPath) {
  const targetId = videoId || (captionTracks && captionTracks[0] && extractVideoId(captionTracks[0].baseUrl));
  if (!targetId) {
    console.warn('YOUTUBE TRANSCRIPT: Video ID is missing');
    return [];
  }

  // 1. Try youtube-transcript package
  try {
    console.log(`YOUTUBE TRANSCRIPT: Fetching with youtube-transcript for video: ${targetId}`);
    const rawTranscript = await YoutubeTranscript.fetchTranscript(targetId);
    if (Array.isArray(rawTranscript) && rawTranscript.length > 0) {
      return rawTranscript.map(item => ({
        text: decodeHTMLEntities(item.text).replace(/\n/g, ' ').trim(),
        start: item.offset / 1000,
        duration: item.duration / 1000
      })).filter(s => s.text);
    }
  } catch (error) {
    console.warn(`YOUTUBE TRANSCRIPT: youtube-transcript package failed: ${error.message}. Trying yt-dlp...`);
  }

  // 2. Try fetching subtitles using yt-dlp
  try {
    const resolvedYtDlp = resolveYtDlp(customYtDlpPath);
    const cookiesPath = process.env.YOUTUBE_COOKIES_PATH || path.join(process.cwd(), 'cookies.txt');
    const hasCookies = fs.existsSync(/*turbopackIgnore: true*/ cookiesPath) && fs.statSync(/*turbopackIgnore: true*/ cookiesPath).size > 10;
    const cookieFlags = hasCookies ? ['--cookies', cookiesPath] : [];

    const dumpJson = await runCommandLine(resolvedYtDlp, [
      '--dump-single-json',
      '--skip-download',
      '--no-warnings',
      '--extractor-args', 'youtube:player_client=visionos,android,ios',
      ...cookieFlags,
      `https://www.youtube.com/watch?v=${targetId}`
    ]);
    const info = JSON.parse(dumpJson);
    const subs = info.subtitles || {};
    const autoSubs = info.automatic_captions || {};

    const langKeys = ['en', 'hi', 'en-orig', 'hi-orig', 'en-US', 'en-GB', ...Object.keys(subs), ...Object.keys(autoSubs)];
    let subUrl = null;

    for (const l of langKeys) {
      const track = (subs[l] || autoSubs[l]);
      if (Array.isArray(track)) {
        const found = track.find(t => t.ext === 'json3') || track.find(t => t.ext === 'vtt') || track[0];
        if (found?.url) {
          subUrl = found.url;
          break;
        }
      }
    }

    if (subUrl) {
      console.log('YOUTUBE TRANSCRIPT: Downloading subtitle stream from yt-dlp...');
      const subRes = await fetch(subUrl, { signal: AbortSignal.timeout(8000) });
      if (subRes.ok) {
        const text = await subRes.text();
        try {
          const jsonSub = JSON.parse(text);
          if (Array.isArray(jsonSub.events)) {
            const parsed = [];
            for (const ev of jsonSub.events) {
              if (ev.segs && ev.tStartMs !== undefined) {
                const segText = ev.segs.map(s => s.utf8 || '').join('').trim();
                if (segText && segText !== '\n') {
                  parsed.push({
                    text: decodeHTMLEntities(segText).replace(/\n/g, ' '),
                    start: ev.tStartMs / 1000,
                    duration: (ev.dDurationMs || 2000) / 1000
                  });
                }
              }
            }
            if (parsed.length > 0) {
              console.log(`YOUTUBE TRANSCRIPT: Successfully extracted ${parsed.length} segments via yt-dlp JSON3 subtitles.`);
              return parsed;
            }
          }
        } catch (_) {
          const vttSegments = parseVttToTranscript(text);
          if (vttSegments.length > 0) {
            console.log(`YOUTUBE TRANSCRIPT: Successfully parsed ${vttSegments.length} segments from VTT.`);
            return vttSegments;
          }
        }
      }
    }
  } catch (ytdlpSubErr) {
    console.warn('YOUTUBE TRANSCRIPT: yt-dlp subtitle extraction failed:', ytdlpSubErr.message);
  }

  console.log('YOUTUBE TRANSCRIPT: No subtitles available; intelligent timeline discovery will be used.');
  return [];
}
