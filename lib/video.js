import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function getFfmpegBinary(customPath) {
  if (customPath && customPath.trim()) return customPath.trim();
  return process.platform === 'linux' ? '/usr/bin/ffmpeg' : '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg';
}

function getYtDlpBinary(customPath) {
  if (customPath && customPath.trim()) return customPath.trim();
  return process.platform === 'linux' ? '/usr/local/bin/yt-dlp' : '/opt/homebrew/bin/yt-dlp';
}

// Helper to execute commands and return a promise
function runCommandLine(command, args) {
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
  });
}

/**
 * Downloads a specific start-end segment of a YouTube video.
 */
export async function downloadVideoClip(youtubeUrl, start, end, outputPath, customYtDlpPath, customFfmpegPath) {
  const ytDlpExecutable = getYtDlpBinary(customYtDlpPath);
  const ffmpegExecutable = getFfmpegBinary(customFfmpegPath);
  const ffmpegDir = path.dirname(ffmpegExecutable);
  
  const startSec = Math.floor(start);
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
    await runCommandLine(ytDlpExecutable, args);
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
    await runCommandLine(ytDlpExecutable, fallbackArgs);
    console.log(`Video clip successfully downloaded via fallback to: ${outputPath}`);
  }
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
