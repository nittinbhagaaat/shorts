import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function getFfmpegBinary(customPath) {
  if (customPath && customPath.trim()) return customPath.trim();
  return process.platform === 'linux' ? '/usr/bin/ffmpeg' : '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
}

function getYtDlpBinary(customPath) {
  const bundled = path.join(process.cwd(), 'bin', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
  
  const candidates = [
    customPath,
    bundled,
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    'yt-dlp',
    '/opt/homebrew/bin/yt-dlp'
  ].filter(Boolean);

  for (const c of candidates) {
    if (c === 'yt-dlp' || c.startsWith('python3')) return c;
    try {
      if (fs.existsSync(c)) return c;
    } catch (e) {}
  }

  return process.platform === 'linux' ? '/usr/local/bin/yt-dlp' : '/opt/homebrew/bin/yt-dlp';
}

// Helper to execute commands and return a promise
function runCommandLine(command, args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command} ${args.join(' ')}`);
    const parts = command.split(' ');
    const bin = parts[0];
    const cmdArgs = parts.length > 1 ? [...parts.slice(1), ...args] : args;

    const proc = spawn(bin, cmdArgs);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      try { proc.kill(); } catch (e) {}
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command exited with code ${code}.\nStderr: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Downloads a specific start-end segment of a YouTube video using multiple resilient strategies.
 */
export async function downloadVideoClip(youtubeUrl, start, end, outputPath, customYtDlpPath, customFfmpegPath) {
  const ytDlpExecutable = getYtDlpBinary(customYtDlpPath);
  const ffmpegExecutable = getFfmpegBinary(customFfmpegPath);
  const ffmpegDir = path.dirname(ffmpegExecutable);
  
  const startSec = Math.floor(start);
  const endSec = Math.ceil(end);

  // Ensure output directory exists
  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const executablesToTry = [
    ytDlpExecutable,
    path.join(process.cwd(), 'bin', 'yt-dlp'),
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
    'yt-dlp',
    'python3 -m yt_dlp'
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  let lastError = null;

  for (const bin of executablesToTry) {
    // Strategy 1: yt-dlp section download using iOS / TV client (Bypasses Datacenter Bot Checks)
    try {
      const args = [
        '--ffmpeg-location', ffmpegDir,
        '--download-sections', `*${startSec}-${endSec}`,
        '--extractor-args', 'youtube:player_client=ios,tv_embedded,android_creator',
        '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        '--no-check-certificates',
        '--force-overwrites',
        '-f', 'bv*+ba/b',
        '--merge-output-format', 'mp4',
        '--no-playlist',
        youtubeUrl,
        '-o', outputPath
      ];
      await runCommandLine(bin, args);
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
        console.log(`[Video Downloader] Section download succeeded with iOS client (${bin}): ${outputPath}`);
        return;
      }
    } catch (err1) {
      console.warn(`[Video Downloader] Strategy 1 (iOS client) failed with ${bin}: ${err1.message}`);
      lastError = err1;
    }

    // Strategy 2: Fallback single-stream MP4 download with TV client
    try {
      const argsFallback = [
        '--ffmpeg-location', ffmpegDir,
        '--download-sections', `*${startSec}-${endSec}`,
        '--extractor-args', 'youtube:player_client=tv_embedded,ios',
        '--no-check-certificates',
        '--force-overwrites',
        '-f', 'best[ext=mp4]/best',
        '--no-playlist',
        youtubeUrl,
        '-o', outputPath
      ];
      await runCommandLine(bin, argsFallback);
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
        console.log(`[Video Downloader] Strategy 2 succeeded with ${bin}: ${outputPath}`);
        return;
      }
    } catch (err2) {
      console.warn(`[Video Downloader] Strategy 2 failed with ${bin}: ${err2.message}`);
      lastError = err2;
    }

    // Strategy 3: Direct stream URL extraction via yt-dlp -g + FFmpeg slice
    try {
      const getUrlArgs = [
        '--extractor-args', 'youtube:player_client=ios,tv_embedded',
        '--user-agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        '--no-check-certificates',
        '-f', 'best[ext=mp4]/best',
        '-g',
        youtubeUrl
      ];
      const streamUrlOutput = await runCommandLine(bin, getUrlArgs);
      const firstUrl = streamUrlOutput.trim().split('\n')[0].trim();

      if (firstUrl.startsWith('http')) {
        const sliceArgs = [
          '-ss', `${startSec}`,
          '-to', `${endSec}`,
          '-i', firstUrl,
          '-c', 'copy',
          '-y',
          outputPath
        ];
        await runCommandLine(ffmpegExecutable, sliceArgs);
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
          console.log(`[Video Downloader] Strategy 3 (Stream URL + FFmpeg) succeeded: ${outputPath}`);
          return;
        }
      }
    } catch (err3) {
      console.warn(`[Video Downloader] Strategy 3 failed with ${bin}: ${err3.message}`);
      lastError = err3;
    }
  }

  // Strategy 4: External Stream API Fallback (Cobalt Engine)
  const cobaltInstances = [
    'https://api.cobalt.tools',
    'https://cobalt-api.kwiatekm.tokyo',
    'https://api.wuk.sh'
  ];

  for (const instance of cobaltInstances) {
    try {
      console.log(`[Video Downloader] Attempting stream extraction via Cobalt (${instance})...`);
      const res = await fetch(instance, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: youtubeUrl,
          videoQuality: '720',
          filenamePattern: 'basic'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const streamUrl = data.url;
        if (streamUrl && streamUrl.startsWith('http')) {
          console.log(`[Video Downloader] Resolved stream via Cobalt. Slicing with FFmpeg...`);
          const sliceArgs = [
            '-ss', `${startSec}`,
            '-to', `${endSec}`,
            '-i', streamUrl,
            '-c', 'copy',
            '-y',
            outputPath
          ];
          await runCommandLine(ffmpegExecutable, sliceArgs, 90000);
          if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
            console.log(`[Video Downloader] Successfully sliced video using Cobalt stream.`);
            return;
          }
        }
      }
    } catch (cobaltErr) {
      console.warn(`[Video Downloader] Cobalt instance ${instance} failed:`, cobaltErr.message);
    }
  }

  throw new Error(`Failed to download video clip: ${lastError ? lastError.message : 'YouTube stream restricted.'}`);
}

/**
 * Format seconds into ASS timestamp format: H:MM:SS.cs (centiseconds)
 */
function formatAssTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);

  const hrsStr = hrs.toString();
  const minsStr = mins.toString().padStart(2, '0');
  const secsStr = secs.toString().padStart(2, '0');
  const csStr = cs.toString().padStart(2, '0');

  return `${hrsStr}:${minsStr}:${secsStr}.${csStr}`;
}

/**
 * Generates an ASS subtitle file content based on the transcript and selected style.
 */
export function generateAssSubtitles(segments, clipStart, style = 'hormozi', isHorizontal = false) {
  const resX = isHorizontal ? 1920 : 1080;
  const resY = isHorizontal ? 1080 : 1920;
  const scale = isHorizontal ? 0.8 : 1.0;

  const styleHeader = `[Script Info]
Title: Auto-Generated Subtitles
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hormozi,Arial,${Math.round(65 * scale)},&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,5,10,10,10,1
Style: Minimalist,Arial,${Math.round(42 * scale)},&H00FFFFFF,&H00000000,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,10,10,${isHorizontal ? 40 : 120},1
Style: Classic,Arial,${Math.round(48 * scale)},&H00FFFFFF,&H00000000,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,2,2,10,10,${isHorizontal ? 40 : 120},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let eventsBlock = '';
  const chosenStyle = style === 'minimalist' ? 'Minimalist' : style === 'classic' ? 'Classic' : 'Hormozi';

  const words = [];
  segments.forEach(seg => {
    const rawWords = seg.text.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return;

    const durationPerWord = seg.duration / rawWords.length;
    rawWords.forEach((word, idx) => {
      const start = seg.start + (idx * durationPerWord) - clipStart;
      const end = start + durationPerWord;
      words.push({
        text: word.replace(/[^\w\s\p{P}]/gu, ''),
        start: Math.max(0, start),
        end: Math.max(0, end)
      });
    });
  });

  if (style === 'hormozi') {
    const phraseSize = 3;
    for (let i = 0; i < words.length; i += phraseSize) {
      const phraseWords = words.slice(i, i + phraseSize);
      if (phraseWords.length === 0) continue;

      phraseWords.forEach((activeWord, activeIdx) => {
        const textParts = phraseWords.map((w, idx) => {
          const cleanText = w.text.toUpperCase();
          if (idx === activeIdx) {
            return `{\\c&H00FFFF&}${cleanText}`;
          } else {
            return `{\\c&HFFFFFF&}${cleanText}`;
          }
        });

        const textLine = textParts.join(' ');
        const startStr = formatAssTime(activeWord.start);
        const endStr = formatAssTime(activeWord.end);

        eventsBlock += `Dialogue: 0,${startStr},${endStr},Hormozi,,0,0,0,,${textLine}\n`;
      });
    }
  } else {
    const phraseSize = 5;
    for (let i = 0; i < words.length; i += phraseSize) {
      const phraseWords = words.slice(i, i + phraseSize);
      if (phraseWords.length === 0) continue;

      const startStr = formatAssTime(phraseWords[0].start);
      const endStr = formatAssTime(phraseWords[phraseWords.length - 1].end);
      const textLine = phraseWords.map(w => w.text).join(' ');

      eventsBlock += `Dialogue: 0,${startStr},${endStr},${chosenStyle},,0,0,0,,${textLine}\n`;
    }
  }

  return styleHeader + eventsBlock;
}

/**
 * Crops a video to 9:16 vertical ratio and burns subtitles in.
 */
export async function renderFinalShort(inputPath, assPath, cropFocus, style, outputPath, isHorizontal = false, customFfmpegPath) {
  const ffmpegExecutable = getFfmpegBinary(customFfmpegPath);
  let videoFilter;
  
  const relativeAssPath = assPath.replace(/\\/g, '/');

  if (isHorizontal) {
    videoFilter = `subtitles=${relativeAssPath}`;
  } else {
    let cropX = '(in_w-out_w)/2';
    if (cropFocus === 'left') {
      cropX = '0';
    } else if (cropFocus === 'right') {
      cropX = 'in_w-out_w';
    }
    const cropFilter = `crop=w=ih*9/16:h=ih:x=${cropX}:y=0`;
    videoFilter = `${cropFilter},subtitles=${relativeAssPath}`;
  }

  const args = [
    '-y',
    '-i', inputPath,
    '-vf', videoFilter,
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '22',
    '-c:a', 'aac',
    '-b:a', '128k',
    outputPath
  ];

  try {
    await runCommandLine(ffmpegExecutable, args);
    console.log(`Rendered short successfully outputted to: ${outputPath} (horizontal: ${isHorizontal})`);
  } catch (error) {
    console.error('Error rendering short with ffmpeg:', error.message);
    throw error;
  }
}
