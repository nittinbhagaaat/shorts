import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const DEFAULT_FFMPEG_PATH = process.env.FFMPEG_PATH || '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
const DEFAULT_YT_DLP_PATH = process.env.YT_DLP_PATH || '/opt/homebrew/bin/yt-dlp';

// Helper to execute commands and return a promise
export function runCommandLine(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command} ${args.join(' ')}`);
    const proc = spawn(command, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command exited with code ${code}.\nStderr: ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Downloads a specific start-end segment of a YouTube video.
 */
export async function downloadVideoClip(youtubeUrl, start, end, outputPath, customYtDlpPath, customFfmpegPath) {
  const ffmpegPath = customFfmpegPath || DEFAULT_FFMPEG_PATH;
  const ytDlpPath = customYtDlpPath || DEFAULT_YT_DLP_PATH;
  const ffmpegDir = path.dirname(ffmpegPath);
  
  // Format start and end as exact integer seconds
  const startSec = Math.max(0, Math.floor(start));
  const endSec = Math.ceil(end);

  const args = [
    '--ffmpeg-location', ffmpegDir,
    '--download-sections', `*${startSec}-${endSec}`,
    '-f', 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best',
    '--merge-output-format', 'mp4',
    '--no-playlist',
    youtubeUrl,
    '-o', outputPath
  ];

  try {
    await runCommandLine(ytDlpPath, args);
    console.log(`Video clip successfully downloaded to: ${outputPath}`);
  } catch (error) {
    console.warn(`yt-dlp download failed with standard format. Trying fallback format 'best'...`);
    const fallbackArgs = [
      '--ffmpeg-location', ffmpegDir,
      '--download-sections', `*${startSec}-${endSec}`,
      '-f', 'best[ext=mp4]/best',
      '--no-playlist',
      youtubeUrl,
      '-o', outputPath
    ];
    await runCommandLine(ytDlpPath, fallbackArgs);
    console.log(`Video clip successfully downloaded via fallback to: ${outputPath}`);
  }
}

/**
 * Format seconds into ASS timestamp format: H:MM:SS.cs (centiseconds)
 */
function formatAssTime(seconds) {
  const clamped = Math.max(0, Number(seconds) || 0);
  const hrs = Math.floor(clamped / 3600);
  const mins = Math.floor((clamped % 3600) / 60);
  const secs = Math.floor(clamped % 60);
  const cs = Math.floor((clamped % 1) * 100);

  const hrsStr = hrs.toString();
  const minsStr = mins.toString().padStart(2, '0');
  const secsStr = secs.toString().padStart(2, '0');
  const csStr = cs.toString().padStart(2, '0');

  return `${hrsStr}:${minsStr}:${secsStr}.${csStr}`;
}

/**
 * Generates ASS subtitle file with frame-accurate dialogue synchronization.
 * Supports both signatures:
 * - generateAssSubtitles(segments, clipStart, clipEnd, style, isHorizontal)
 * - generateAssSubtitles(segments, clipStart, style, isHorizontal)
 */
export function generateAssSubtitles(segments, clipStart, clipEndOrStyle = 60, maybeStyle = 'hormozi', maybeIsHorizontal = false) {
  let clipEnd;
  let style;
  let isHorizontal;

  if (typeof clipEndOrStyle === 'string') {
    // Called with (segments, clipStart, style, isHorizontal)
    style = clipEndOrStyle;
    isHorizontal = Boolean(maybeStyle);
    clipEnd = (typeof clipStart === 'number' ? clipStart + 60 : 60);
  } else {
    // Called with (segments, clipStart, clipEnd, style, isHorizontal)
    clipEnd = typeof clipEndOrStyle === 'number' ? clipEndOrStyle : ((typeof clipStart === 'number' ? clipStart : 0) + 60);
    style = typeof maybeStyle === 'string' ? maybeStyle : 'hormozi';
    isHorizontal = Boolean(maybeIsHorizontal);
  }

  const resX = isHorizontal ? 1920 : 1080;
  const resY = isHorizontal ? 1080 : 1920;
  const scale = isHorizontal ? 0.75 : 1.0;

  // The base reference time is startSec (Math.floor(clipStart)) as downloaded by yt-dlp
  const clipBaseTime = Math.max(0, Math.floor(Number(clipStart) || 0));
  const maxClipDuration = Math.max(10, (Number(clipEnd) || (clipBaseTime + 60)) - clipBaseTime);

  // ASS Styles Definition
  const styleHeader = `[Script Info]
Title: clip.studio Subtitles
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Hormozi,Arial Unicode MS,${Math.round(62 * scale)},&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,0,2,20,20,${isHorizontal ? 60 : 260},1
Style: Minimalist,Arial Unicode MS,${Math.round(42 * scale)},&H00FFFFFF,&H00000000,&H00000000,&H90000000,0,0,0,0,100,100,0,0,1,2,0,2,20,20,${isHorizontal ? 60 : 180},1
Style: Classic,Arial Unicode MS,${Math.round(46 * scale)},&H00FFFFFF,&H00000000,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,3,0,2,20,20,${isHorizontal ? 60 : 180},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let eventsBlock = '';
  const chosenStyle = style === 'minimalist' ? 'Minimalist' : style === 'classic' ? 'Classic' : 'Hormozi';

  // Extract all words from segments with exact dialogue timestamping
  const words = [];
  (segments || []).forEach((seg) => {
    const rawWords = (seg.text || '').split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return;

    const segStart = typeof seg.start === 'number' ? seg.start : 0;
    const segDuration = typeof seg.duration === 'number' && seg.duration > 0 ? seg.duration : 2.5;
    const durationPerWord = segDuration / rawWords.length;

    rawWords.forEach((word, idx) => {
      const absWordStart = segStart + (idx * durationPerWord);
      const absWordEnd = absWordStart + durationPerWord;

      // Calculate relative timestamps relative to video 0.0s (clipBaseTime)
      const relStart = absWordStart - clipBaseTime;
      const relEnd = absWordEnd - clipBaseTime;

      // Filter words inside the clip duration window
      if (relEnd > 0.05 && relStart < (maxClipDuration + 3)) {
        words.push({
          text: word.replace(/[^\w\s\p{P}\u0900-\u097F]/gu, ''),
          start: Math.max(0, relStart),
          end: Math.max(0.1, relEnd),
        });
      }
    });
  });

  if (words.length === 0) {
    // If no word timing was found in segments, output whole segment dialogues as fallback
    (segments || []).forEach((seg) => {
      const relStart = Math.max(0, (Number(seg.start) || 0) - clipBaseTime);
      const relEnd = Math.max(relStart + 1, relStart + (Number(seg.duration) || 2.5));
      if (relStart < maxClipDuration + 3 && seg.text) {
        const startStr = formatAssTime(relStart);
        const endStr = formatAssTime(relEnd);
        eventsBlock += `Dialogue: 0,${startStr},${endStr},${chosenStyle},,0,0,0,,${seg.text}\n`;
      }
    });
    return styleHeader + eventsBlock;
  }

  if (style === 'hormozi') {
    // Alex Hormozi Style: Word-by-word active highlight in short 2-3 word phrase chunks
    const phraseSize = 3;
    for (let i = 0; i < words.length; i += phraseSize) {
      const phraseWords = words.slice(i, i + phraseSize);
      if (phraseWords.length === 0) continue;

      phraseWords.forEach((activeWord, activeIdx) => {
        const textParts = phraseWords.map((w, idx) => {
          const cleanText = w.text.toUpperCase();
          if (idx === activeIdx) {
            // Highlight color in ASS (&H0000FFFF& = bright yellow in BGR)
            return `{\\c&H0000FFFF&}${cleanText}`;
          } else {
            // Inactive white color
            return `{\\c&H00FFFFFF&}${cleanText}`;
          }
        });

        const textLine = textParts.join(' ');
        const startStr = formatAssTime(activeWord.start);
        const endStr = formatAssTime(activeWord.end);

        eventsBlock += `Dialogue: 0,${startStr},${endStr},Hormozi,,0,0,0,,${textLine}\n`;
      });
    }
  } else {
    // Minimalist & Classic: Group words into natural 4-5 word phrases
    const phraseSize = 4;
    for (let i = 0; i < words.length; i += phraseSize) {
      const phraseWords = words.slice(i, i + phraseSize);
      if (phraseWords.length === 0) continue;

      const startStr = formatAssTime(phraseWords[0].start);
      const endStr = formatAssTime(phraseWords[phraseWords.length - 1].end);
      const textLine = phraseWords.map((w) => w.text).join(' ');

      eventsBlock += `Dialogue: 0,${startStr},${endStr},${chosenStyle},,0,0,0,,${textLine}\n`;
    }
  }

  return styleHeader + eventsBlock;
}

/**
 * Crops a video to 9:16 vertical ratio (or keeps 16:9) and optionally burns subtitles in.
 */
export async function renderFinalShort(inputPath, assPath, cropFocus, style, outputPath, isHorizontal = false, customFfmpegPath = null) {
  const ffmpegPath = customFfmpegPath || DEFAULT_FFMPEG_PATH;
  const isSubtitleEnabled = style !== 'none' && Boolean(assPath);
  const fileExists = isSubtitleEnabled && fs.existsSync(assPath);
  const hasSubtitles = isSubtitleEnabled && fileExists;

  const normalizedAssPath = assPath ? assPath.replace(/\\/g, '/') : null;

  let videoFilter = null;

  if (isHorizontal) {
    // Landscape 16:9 layout
    if (hasSubtitles) {
      videoFilter = `subtitles=${normalizedAssPath}`;
    }
  } else {
    // Portrait 9:16 layout
    let cropX = '(in_w-out_w)/2'; // Center focus
    if (cropFocus === 'left') {
      cropX = '0';
    } else if (cropFocus === 'right') {
      cropX = 'in_w-out_w';
    }
    const cropFilter = `crop=w=ih*9/16:h=ih:x=${cropX}:y=0`;
    
    if (hasSubtitles) {
      videoFilter = `${cropFilter},subtitles=${normalizedAssPath}`;
    } else {
      videoFilter = cropFilter;
    }
  }

  const args = [
    '-y',
    '-i', inputPath,
  ];

  if (videoFilter) {
    args.push('-vf', videoFilter);
  }

  args.push(
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '22',
    '-c:a', 'aac',
    '-b:a', '128k',
    outputPath
  );

  try {
    await runCommandLine(ffmpegPath, args);
    console.log(`Rendered short successfully outputted to: ${outputPath} (horizontal: ${isHorizontal}, subtitles: ${hasSubtitles})`);
  } catch (error) {
    console.error('Error rendering short with ffmpeg:', error.message);
    throw error;
  }
}
