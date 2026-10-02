import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const DEFAULT_FFMPEG_PATH = process.env.FFMPEG_PATH || '/opt/homebrew/bin/ffmpeg';
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

  const cookiesPath = process.env.YOUTUBE_COOKIES_PATH || path.join(process.cwd(), 'cookies.txt');
  const hasCookies = fs.existsSync(/*turbopackIgnore: true*/ cookiesPath);
  const cookieFlags = hasCookies ? ['--cookies', cookiesPath] : [];

  // Attempt 1: Android + iOS + Web player clients with Node.js JS runtime solver
  const attempt1Args = [
    '--no-playlist',
    '--no-warnings',
    '--ffmpeg-location', ffmpegDir,
    '--extractor-args', 'youtube:player_client=android,ios,web',
    '--js-runtimes', 'node',
    ...cookieFlags,
    '--download-sections', `*${startSec}-${endSec}`,
    '-f', 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]/best',
    '--merge-output-format', 'mp4',
    youtubeUrl,
    '-o', outputPath
  ];

  try {
    await runCommandLine(ytDlpPath, attempt1Args);
    console.log(`Video clip successfully downloaded to: ${outputPath}`);
    return;
  } catch (error1) {
    console.warn(`yt-dlp Attempt 1 (android,ios,web) failed: ${error1.message}. Trying Attempt 2 with pure Android client...`);
  }

  // Attempt 2: Pure Android client (bypasses datacenter web bot challenges)
  const attempt2Args = [
    '--no-playlist',
    '--no-warnings',
    '--ffmpeg-location', ffmpegDir,
    '--extractor-args', 'youtube:player_client=android',
    '--js-runtimes', 'node',
    ...cookieFlags,
    '--download-sections', `*${startSec}-${endSec}`,
    '-f', 'best[ext=mp4]/bestvideo+bestaudio/best',
    '--merge-output-format', 'mp4',
    youtubeUrl,
    '-o', outputPath
  ];

  try {
    await runCommandLine(ytDlpPath, attempt2Args);
    console.log(`Video clip successfully downloaded via Android client to: ${outputPath}`);
    return;
  } catch (error2) {
    console.warn(`yt-dlp Attempt 2 (android) failed: ${error2.message}. Trying Attempt 3 with TV/iOS client...`);
  }

  // Attempt 3: TV / iOS client fallback
  const attempt3Args = [
    '--no-playlist',
    '--no-warnings',
    '--ffmpeg-location', ffmpegDir,
    '--extractor-args', 'youtube:player_client=tv,ios',
    '--js-runtimes', 'node',
    ...cookieFlags,
    '--download-sections', `*${startSec}-${endSec}`,
    '-f', 'best',
    '--merge-output-format', 'mp4',
    youtubeUrl,
    '-o', outputPath
  ];

  await runCommandLine(ytDlpPath, attempt3Args);
  console.log(`Video clip successfully downloaded via TV/iOS client to: ${outputPath}`);
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
 * Converts Hex RGB (#RRGGBB) to ASS Color format (&HAABBGGRR&)
 */
function hexToAssColor(hex, opacity = 1.0) {
  const cleanHex = (hex || '#FFFFFF').replace('#', '').trim();
  const r = cleanHex.substring(0, 2) || 'FF';
  const g = cleanHex.substring(2, 4) || 'FF';
  const b = cleanHex.substring(4, 6) || 'FF';
  
  // Alpha in ASS: 00 = fully opaque, FF = fully transparent
  const alphaInt = Math.max(0, Math.min(255, Math.round((1.0 - opacity) * 255)));
  const a = alphaInt.toString(16).padStart(2, '0').toUpperCase();

  return `&H${a}${b}${g}${r}&`;
}

/**
 * Generates ASS subtitle file with 10 viral typography styles, customizable positioning,
 * and custom overlay text support with opacity.
 */
export function generateAssSubtitles(
  segments,
  clipStart,
  clipEndOrStyle = 60,
  maybeStyle = 'hormozi',
  maybeIsHorizontal = false,
  extraOptions = {}
) {
  let clipEnd;
  let style;
  let isHorizontal;
  let options = {};

  if (typeof clipEndOrStyle === 'string') {
    style = clipEndOrStyle;
    isHorizontal = Boolean(maybeStyle);
    clipEnd = (typeof clipStart === 'number' ? clipStart + 60 : 60);
    if (typeof maybeIsHorizontal === 'object' && maybeIsHorizontal !== null) {
      options = maybeIsHorizontal;
    }
  } else {
    clipEnd = typeof clipEndOrStyle === 'number' ? clipEndOrStyle : ((typeof clipStart === 'number' ? clipStart : 0) + 60);
    style = typeof maybeStyle === 'string' ? maybeStyle : 'hormozi';
    isHorizontal = Boolean(maybeIsHorizontal);
    if (typeof extraOptions === 'object' && extraOptions !== null) {
      options = extraOptions;
    }
  }

  const resX = isHorizontal ? 1920 : 1080;
  const resY = isHorizontal ? 1080 : 1920;
  const scale = isHorizontal ? 0.72 : 1.0;

  const clipBaseTime = Math.max(0, Math.floor(Number(clipStart) || 0));
  const maxClipDuration = Math.max(10, (Number(clipEnd) || (clipBaseTime + 60)) - clipBaseTime);

  // Position parameters
  // captionYPercent: percentage from top (e.g. 72 means lower third, 15 means near top)
  const captionYPercent = typeof options.captionYPercent === 'number' ? options.captionYPercent : (isHorizontal ? 82 : 72);
  const captionAlign = options.captionAlign || 'center'; // center, left, right

  // ASS alignment: 2 = bottom-center, 1 = bottom-left, 3 = bottom-right
  const alignment = captionAlign === 'left' ? 1 : captionAlign === 'right' ? 3 : 2;
  const marginL = captionAlign === 'left' ? 40 : 20;
  const marginR = captionAlign === 'right' ? 40 : 20;

  // MarginV is distance from bottom edge
  const marginV = Math.max(30, Math.min(resY - 80, Math.round(resY * (1.0 - (captionYPercent / 100.0)))));

  // 10 Caption Typography Styles Definitions
  // In ASS: Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
  const stylesDefinitions = [
    // 1. Hormozi: Bold uppercase, white text, active word bright yellow, 5px black outline
    `Style: Hormozi,Arial Unicode MS,${Math.round(62 * scale)},&H00FFFFFF,&H0000FFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,2,${alignment},${marginL},${marginR},${marginV},1`,
    
    // 2. MrBeast: Super bold, bright yellow fill (&H0000FFFF), active lime green (&H0000FF00), heavy 6px outline
    `Style: MrBeast,Impact,${Math.round(64 * scale)},&H0000FFFF,&H0000FF00,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,6,3,${alignment},${marginL},${marginR},${marginV},1`,
    
    // 3. Neon Cyberpunk: Electric cyan (&H00FFFF00) with glowing magenta shadow (&H00FF00FF)
    `Style: Neon,Arial Unicode MS,${Math.round(56 * scale)},&H00FFFF00,&H00FFFFFF,&H00FF00FF,&H00FF00FF,-1,0,0,0,100,100,1,0,1,4,4,${alignment},${marginL},${marginR},${marginV},1`,
    
    // 4. Minimalist Clean: Modern sans-serif, pure white on translucent dark pill background (BorderStyle: 3)
    `Style: Minimalist,Arial Unicode MS,${Math.round(44 * scale)},&H00FFFFFF,&H00000000,&H00000000,&H90000000,0,0,0,0,100,100,0,0,3,3,0,${alignment},${marginL},${marginR},${marginV},1`,
    
    // 5. Classic Subtitle: Traditional crisp TV/Movie white with clean 2.5px outline
    `Style: Classic,Arial Unicode MS,${Math.round(48 * scale)},&H00FFFFFF,&H00000000,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,3,1,${alignment},${marginL},${marginR},${marginV},1`,
    
    // 6. Karaoke Fire: Bold white with hot fiery orange active highlight (&H000080FF)
    `Style: Karaoke,Arial Unicode MS,${Math.round(60 * scale)},&H00FFFFFF,&H000080FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,5,2,${alignment},${marginL},${marginR},${marginV},1`,
    
    // 7. Retro VHS 90s: Vintage amber gold (&H0020E0FF), monospace typewriter font with CRT drop shadow
    `Style: Retro,Courier New,${Math.round(48 * scale)},&H0020E0FF,&H00FFFFFF,&H00000000,&H90000000,-1,0,0,0,100,100,0,0,1,3,3,${alignment},${marginL},${marginR},${marginV},1`,
    
    // 8. Cinematic Serif: Elegant Georgia/Times serif, italicized, soft ivory text (&H00F0F8FF)
    `Style: Cinematic,Georgia,${Math.round(50 * scale)},&H00F0F8FF,&H00000000,&H00151515,&H00000000,0,-1,0,0,100,100,1,0,1,2,3,${alignment},${marginL},${marginR},${marginV},1`,
    
    // 9. Bold Red Badge: Bold white on striking solid crimson badge box (&H002020DC)
    `Style: BoldBadge,Arial Unicode MS,${Math.round(50 * scale)},&H00FFFFFF,&H00000000,&H002020DC,&H002020DC,-1,0,0,0,100,100,0,0,3,4,0,${alignment},${marginL},${marginR},${marginV},1`,
    
    // 10. Comic Pop Art: Playful banana yellow (&H0000E6FF), thick cartoon outline (6px), italic
    `Style: Comic,Arial Unicode MS,${Math.round(58 * scale)},&H0000E6FF,&H000040FF,&H00000000,&H00000000,-1,-1,0,0,100,100,0,0,1,6,3,${alignment},${marginL},${marginR},${marginV},1`,
  ];

  // Optional Custom Overlay Text Style
  let overlayStyleLine = '';
  if (options.overlayText && options.overlayText.trim()) {
    const ovOpacity = typeof options.overlayTextOpacity === 'number' ? options.overlayTextOpacity : 1.0;
    const ovColor = options.overlayTextColor || '#FFFFFF';
    const ovSize = options.overlayTextSize || 'medium';
    const ovBg = options.overlayTextBg !== false;

    let fontSize = 48;
    if (ovSize === 'small') fontSize = 34;
    else if (ovSize === 'large') fontSize = 64;
    else if (ovSize === 'huge') fontSize = 80;

    const ovScaledSize = Math.round(fontSize * scale);
    const ovPrimary = hexToAssColor(ovColor, ovOpacity);
    const ovBack = ovBg ? hexToAssColor('#000000', ovOpacity * 0.75) : '&HFF000000&';
    const ovOutline = ovBg ? ovBack : hexToAssColor('#000000', ovOpacity);
    const ovBorderStyle = ovBg ? 3 : 1;

    const ovYPercent = typeof options.overlayTextYPercent === 'number' ? options.overlayTextYPercent : 15;
    const ovMarginV = Math.max(30, Math.min(resY - 60, Math.round(resY * (1.0 - (ovYPercent / 100.0)))));

    overlayStyleLine = `Style: OverlayStyle,Arial Unicode MS,${ovScaledSize},${ovPrimary},&H00FFFFFF,${ovOutline},${ovBack},-1,0,0,0,100,100,0,0,${ovBorderStyle},4,2,2,30,30,${ovMarginV},1\n`;
  }

  const styleHeader = `[Script Info]
Title: clip.studio Dynamic Subtitles
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${stylesDefinitions.join('\n')}
${overlayStyleLine}
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let eventsBlock = '';

  // Map input style ID to style name
  const styleMap = {
    hormozi: 'Hormozi',
    mrbeast: 'MrBeast',
    neon: 'Neon',
    minimalist: 'Minimalist',
    classic: 'Classic',
    karaoke: 'Karaoke',
    retro: 'Retro',
    cinematic: 'Cinematic',
    bold_badge: 'BoldBadge',
    comic: 'Comic'
  };
  const chosenStyle = styleMap[style] || 'Hormozi';

  // Add custom overlay text event if requested
  if (options.overlayText && options.overlayText.trim()) {
    const endAssStr = formatAssTime(maxClipDuration + 2);
    const cleanOverlayText = options.overlayText.replace(/\r?\n/g, '\\N').trim();
    eventsBlock += `Dialogue: 1,0:00:00.00,${endAssStr},OverlayStyle,,0,0,0,,${cleanOverlayText}\n`;
  }

  // Strict check: if subtitles are turned off or style is 'none' / 'clean', skip generating subtitle dialogue events
  const shouldGenerateSubtitles = options.enableSubtitles !== false && style !== 'none' && style !== 'clean';
  if (!shouldGenerateSubtitles) {
    return styleHeader + eventsBlock;
  }

  // Extract all words from segments with frame-accurate timestamping
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

  // Word-by-word active animation for energetic styles: hormozi, mrbeast, neon, karaoke, comic
  const isWordByWordStyle = ['hormozi', 'mrbeast', 'neon', 'karaoke', 'comic'].includes(style);

  if (isWordByWordStyle) {
    const phraseSize = 3;
    for (let i = 0; i < words.length; i += phraseSize) {
      const phraseWords = words.slice(i, i + phraseSize);
      if (phraseWords.length === 0) continue;

      phraseWords.forEach((activeWord, activeIdx) => {
        const textParts = phraseWords.map((w, idx) => {
          const isCurrent = idx === activeIdx;
          const cleanText = (style === 'hormozi' || style === 'mrbeast' || style === 'neon')
            ? w.text.toUpperCase()
            : w.text;

          if (isCurrent) {
            if (style === 'mrbeast') {
              // Active word in bright neon lime green
              return `{\\c&H0000FF00&}${cleanText}`;
            } else if (style === 'karaoke') {
              // Active word in fiery orange
              return `{\\c&H000080FF&}${cleanText}`;
            } else if (style === 'neon') {
              // Active word in pure luminous white with cyan aura
              return `{\\c&H00FFFFFF&}${cleanText}`;
            } else if (style === 'comic') {
              // Active word in punchy vibrant orange
              return `{\\c&H000066FF&}${cleanText}`;
            } else {
              // Hormozi default: bright yellow
              return `{\\c&H0000FFFF&}${cleanText}`;
            }
          } else {
            // Inactive word color
            if (style === 'mrbeast') {
              return `{\\c&H0000FFFF&}${cleanText}`; // Yellow base
            } else if (style === 'neon') {
              return `{\\c&H00FFFF00&}${cleanText}`; // Cyan base
            } else if (style === 'comic') {
              return `{\\c&H0000E6FF&}${cleanText}`; // Banana yellow base
            } else {
              return `{\\c&H00FFFFFF&}${cleanText}`; // White base
            }
          }
        });

        const textLine = textParts.join(' ');
        const startStr = formatAssTime(activeWord.start);
        const endStr = formatAssTime(activeWord.end);

        eventsBlock += `Dialogue: 0,${startStr},${endStr},${chosenStyle},,0,0,0,,${textLine}\n`;
      });
    }
  } else {
    // Phrase-based styles: minimalist, classic, retro, cinematic, bold_badge
    const phraseSize = 4;
    for (let i = 0; i < words.length; i += phraseSize) {
      const phraseWords = words.slice(i, i + phraseSize);
      if (phraseWords.length === 0) continue;

      const startStr = formatAssTime(phraseWords[0].start);
      const endStr = formatAssTime(phraseWords[phraseWords.length - 1].end);
      let textLine = phraseWords.map((w) => w.text).join(' ');

      if (style === 'bold_badge') {
        textLine = textLine.toUpperCase();
      }

      eventsBlock += `Dialogue: 0,${startStr},${endStr},${chosenStyle},,0,0,0,,${textLine}\n`;
    }
  }

  return styleHeader + eventsBlock;
}

/**
 * Crops a video to 9:16 vertical ratio (with AI active speaker tracking or manual focus)
 * and burns in styled subtitles and text overlays.
 */
export async function renderFinalShort(
  inputPath,
  assPath,
  cropFocus = 'auto',
  style = 'hormozi',
  outputPath,
  isHorizontal = false,
  customFfmpegPath = null
) {
  const ffmpegPath = customFfmpegPath || DEFAULT_FFMPEG_PATH;
  const isSubtitleExplicitlyDisabled = style === 'none' || style === 'clean';
  const fileExists = Boolean(assPath) && fs.existsSync(assPath);
  let hasAssEvents = false;

  if (fileExists) {
    try {
      const assContent = fs.readFileSync(assPath, 'utf8');
      if (isSubtitleExplicitlyDisabled) {
        // Only burn if an overlay text dialogue event was explicitly added
        hasAssEvents = assContent.includes('OverlayStyle');
      } else {
        hasAssEvents = assContent.includes('Dialogue:');
      }
    } catch (e) {
      hasAssEvents = false;
    }
  }

  const normalizedAssPath = assPath ? assPath.replace(/\\/g, '/') : null;
  let videoFilter = null;

  if (isHorizontal) {
    // Landscape 16:9 layout
    if (hasAssEvents) {
      videoFilter = `subtitles=${normalizedAssPath}`;
    }
  } else {
    // Portrait 9:16 vertical layout
    let cropFilter = 'crop=w=ih*9/16:h=ih:x=(in_w-out_w)/2:y=0'; // Center fallback

    if (cropFocus === 'auto') {
      console.log(`RENDER API: Running AI active speaker tracking on ${inputPath}...`);
      try {
        const pythonScript = path.join(process.cwd(), 'scripts', 'auto_framing.py');
        const autoFramingOutput = await runCommandLine('python3', [pythonScript, '--input', inputPath]);
        const parsed = JSON.parse(autoFramingOutput.trim());
        if (parsed.success && parsed.cropFilter) {
          cropFilter = parsed.cropFilter;
          console.log(`RENDER API: Active speaker tracking successfully generated filter: ${parsed.message || cropFilter}`);
        } else {
          console.warn(`RENDER API: Auto-framing returned fallback: ${parsed.message || 'using center crop'}`);
        }
      } catch (autoErr) {
        console.warn('RENDER API: Vision auto-framing error, defaulting to center crop:', autoErr.message);
        cropFilter = 'crop=w=ih*9/16:h=ih:x=(in_w-out_w)/2:y=0';
      }
    } else if (cropFocus === 'left') {
      cropFilter = 'crop=w=ih*9/16:h=ih:x=0:y=0';
    } else if (cropFocus === 'right') {
      cropFilter = 'crop=w=ih*9/16:h=ih:x=in_w-out_w:y=0';
    } else {
      // center
      cropFilter = 'crop=w=ih*9/16:h=ih:x=(in_w-out_w)/2:y=0';
    }

    if (hasAssEvents) {
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
    console.log(`Rendered short successfully outputted to: ${outputPath} (horizontal: ${isHorizontal}, subtitles: ${hasAssEvents}, crop: ${cropFocus})`);
  } catch (error) {
    console.error('Error rendering short with ffmpeg:', error.message);
    throw error;
  }
}
