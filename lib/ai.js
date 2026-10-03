// lib/ai.js

function cleanJsonString(str) {
  if (!str) return '[]';
  
  // Look for JSON block in markdown formatting: ```json [JSON content] ```
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = str.match(jsonBlockRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Fallback to finding first '[' and last ']' or first '{' and last '}'
  const firstBracket = str.indexOf('[');
  const lastBracket = str.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return str.substring(firstBracket, lastBracket + 1).trim();
  }

  const firstBrace = str.indexOf('{');
  const lastBrace = str.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return str.substring(firstBrace, lastBrace + 1).trim();
  }
  
  return str.trim();
}

function normalizeClipsOutput(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.clips)) return raw.clips;
  if (Array.isArray(raw.viral_clips)) return raw.viral_clips;
  if (Array.isArray(raw.moments)) return raw.moments;
  if (Array.isArray(raw.viralMoments)) return raw.viralMoments;
  if (Array.isArray(raw.data)) return raw.data;
  if (Array.isArray(raw.items)) return raw.items;
  if (typeof raw === 'object') {
    const values = Object.values(raw);
    if (values.length > 0 && typeof values[0] === 'object' && values[0] && typeof values[0].start === 'number') {
      return values;
    }
  }
  return [];
}

import { devanagariToHinglish, hasDevanagari, transliterateTranscript } from './transliterate.js';
export { devanagariToHinglish, hasDevanagari, transliterateTranscript, generateIntelligentFallbackClips, normalizeClipsOutput };

/**
 * Intelligent semantic clip discovery across the ENTIRE video.
 * Does NOT start at 0:00 (skips opening fluff).
 * Discovers complete, meaningful conversations up to 1 minute 30 seconds (up to 90s).
 */
function generateIntelligentFallbackClips(transcript, videoDuration, videoMeta = {}) {
  const targetClips = Math.min(20, Math.max(1, parseInt(videoMeta.targetClips, 10) || 5));
  const effectiveDuration = Math.max(180, Number(videoDuration) || 600);
  const userMin = Math.max(10, Math.min(180, parseInt(videoMeta.minDuration, 10) || 30));
  const userMax = Math.max(userMin + 5, Math.min(300, parseInt(videoMeta.maxDuration, 10) || 60));
  const span = userMax - userMin;
  console.log(`Intelligent Clip Finder: Scanning entire ${Math.floor(effectiveDuration)}s video for ${targetClips} viral moments with duration ${userMin}s to ${userMax}s...`);

  // Target duration profiles scaled to user min & max
  const durationTiers = [
    { name: 'short', min: userMin, max: Math.min(userMax, Math.round(userMin + span * 0.4)), ideal: Math.round(userMin + span * 0.25) },
    { name: 'medium', min: Math.round(userMin + span * 0.3), max: Math.min(userMax, Math.round(userMin + span * 0.75)), ideal: Math.round(userMin + span * 0.5) },
    { name: 'long', min: Math.round(userMin + span * 0.6), max: userMax, ideal: Math.round(userMin + span * 0.85) }
  ];

  if (!transcript || transcript.length === 0) {
    const clips = [];
    const targetDurs = [
      Math.round(userMin + span * 0.3),
      Math.round(userMin + span * 0.7),
      Math.round(userMin + span * 0.5),
      Math.round(userMin + span * 0.85),
      userMin + 2,
      userMax - 2
    ].map(d => Math.max(userMin, Math.min(userMax, d)));
    const startOffset = effectiveDuration > 180 ? 60 : 0;
    const availableDuration = Math.max(60, effectiveDuration - startOffset - 20);
    const step = availableDuration / targetClips;
    const baseTitle = videoMeta.title ? devanagariToHinglish(videoMeta.title.slice(0, 32)) : 'Viral Scene';

    for (let i = 0; i < targetClips; i++) {
      const start = Math.floor(startOffset + (i * step));
      const clipLength = targetDurs[i % targetDurs.length];
      const end = Math.min(Math.floor(effectiveDuration), start + clipLength);
      const actualDuration = end - start;
      clips.push({
        title: `${baseTitle} #${i + 1} (${Math.floor(start / 60)}m)`,
        description: `Highlight conversation from ${Math.floor(start / 60)}:${(start % 60).toString().padStart(2, '0')} to ${Math.floor(end / 60)}:${(end % 60).toString().padStart(2, '0')}.`,
        start,
        end,
        duration: actualDuration,
        viralScore: 92 - (i * 2)
      });
    }
    return clips;
  }

  // Skip intro greetings and fluff (first 50s for videos > 2 mins)
  const introCutoff = effectiveDuration > 120 ? 50 : 0;
  const usableDuration = Math.max(60, effectiveDuration - introCutoff - 25);
  const zoneSize = usableDuration / targetClips;
  const discoveredClips = [];

  for (let z = 0; z < targetClips; z++) {
    const tier = durationTiers[z % durationTiers.length];
    const zoneStart = introCutoff + (z * zoneSize);
    const zoneEnd = zoneStart + zoneSize;

    // Filter candidate start segments in this zone
    const candidateStarters = transcript.filter((s) => s.start >= zoneStart && s.start < zoneEnd);
    if (candidateStarters.length === 0) continue;

    let bestClip = null;
    let bestScore = -999;
    let fallbackClip = null;
    let fallbackScore = -999;

    // Stride through starters in the zone to find the best complete conversation
    const stepSize = Math.max(1, Math.floor(candidateStarters.length / 15));
    for (let i = 0; i < candidateStarters.length; i += stepSize) {
      const startSeg = candidateStarters[i];
      const startSec = Math.floor(startSeg.start);
      let combinedSegments = [];
      let markerPoints = 30;

      const startIndex = transcript.indexOf(startSeg);
      for (let j = startIndex; j < transcript.length; j++) {
        const seg = transcript[j];
        if (!seg) break;
        const curDur = (seg.start + (seg.duration || 2)) - startSec;
        if (curDur > userMax + 2) break; // Strict upper limit according to user preference

        combinedSegments.push(seg);
        const segText = seg.text || '';

        // Scoring for viral engagement
        if (/\[(हंसी|हँसी|laughter)\]/i.test(segText)) markerPoints += 20;
        if (/\[(हौसला बढ़ाने की आवाज़|प्रशंसा|तालियां|applause|cheering)\]/i.test(segText)) markerPoints += 25;
        if (/[?!]/i.test(segText)) markerPoints += 10;
        if (/(money|paisa|acting|story|police|girl|problem|roast|funny|boss|job|secret|love)/i.test(segText)) markerPoints += 12;

        // Natural conversation conclusion check
        const isNaturalEnd = curDur >= Math.max(10, userMin - 3) && (
          /\[(हंसी|हँसी|laughter|हौसला|applause)\]/i.test(segText) ||
          /[.!?।]$/.test(segText.trim()) ||
          (j < transcript.length - 1 && transcript[j + 1].start - (seg.start + (seg.duration || 2)) > 0.6)
        );

        if (isNaturalEnd && curDur >= Math.max(10, userMin - 3) && curDur <= userMax + 2) {
          const endSec = Math.ceil(seg.start + (seg.duration || 2));
          const actualDuration = endSec - startSec;

          const densityScore = (markerPoints / Math.sqrt(actualDuration)) * 6.5;
          const proximityBonus = 30 - Math.abs(actualDuration - tier.ideal) * 1.1;
          const totalCandidateScore = densityScore + proximityBonus;

          const fullText = combinedSegments.map((s) => s.text).join(' ');
          const rawWords = fullText.split(/\s+/).filter(Boolean);
          const meaningfulWords = rawWords
            .filter((w) => !/^(aur|to|ki|hai|hain|mein|se|ne|ko|ka|ke|ye|woh|and|is|a|an|the|of|in|to|d|the)$/i.test(w))
            .slice(0, 5)
            .join(' ');

          const hinglishTitle = devanagariToHinglish(meaningfulWords);
          const title = hinglishTitle && hinglishTitle.trim().length > 3
            ? `${hinglishTitle.charAt(0).toUpperCase() + hinglishTitle.slice(1)}...`
            : `Viral Highlight (${Math.floor(startSec / 60)}:${(startSec % 60).toString().padStart(2, '0')})`;

          const candidateObj = {
            title,
            description: `Complete conversation discussing "${devanagariToHinglish(rawWords.slice(0, 10).join(' '))}..."`,
            start: startSec,
            end: endSec,
            duration: actualDuration,
            viralScore: Math.min(99, Math.max(75, Math.round(densityScore + 40)))
          };

          if (actualDuration >= tier.min && actualDuration <= tier.max) {
            if (totalCandidateScore > bestScore) {
              bestScore = totalCandidateScore;
              bestClip = candidateObj;
            }
          }

          if (densityScore > fallbackScore) {
            fallbackScore = densityScore;
            fallbackClip = candidateObj;
          }
        }
      }
    }

    const chosen = bestClip || fallbackClip;
    if (chosen) {
      discoveredClips.push(chosen);
    }
  }

  // Deduplicate and remove overlapping ranges
  const finalClips = [];
  for (const c of discoveredClips) {
    const isOverlapping = finalClips.some((existing) => 
      Math.abs(existing.start - c.start) < 30 || 
      (c.start < existing.end && c.end > existing.start)
    );
    if (!isOverlapping) finalClips.push(c);
  }

  // Fill up to targetClips if any slots remain
  if (finalClips.length < targetClips) {
    const shortThreshold = Math.round(userMin + span * 0.4);
    const medThreshold = Math.round(userMin + span * 0.75);
    const shortCount = finalClips.filter(c => c.duration <= shortThreshold).length;
    const medCount = finalClips.filter(c => c.duration > shortThreshold && c.duration <= medThreshold).length;
    const longCount = finalClips.filter(c => c.duration > medThreshold).length;

    const neededTier = shortCount <= medCount && shortCount <= longCount ? durationTiers[0]
      : medCount <= longCount ? durationTiers[1] : durationTiers[2];

    const candidates = [];
    const stepSize = Math.max(1, Math.floor(transcript.length / 40));
    for (let i = 0; i < transcript.length; i += stepSize) {
      const startSeg = transcript[i];
      if (startSeg.start < introCutoff) continue;
      const startSec = Math.floor(startSeg.start);

      if (finalClips.some(e => startSec >= e.start - 10 && startSec <= e.end + 10)) continue;

      let markerPoints = 30;
      let combinedSegments = [];
      for (let j = i; j < Math.min(transcript.length, i + 50); j++) {
        const seg = transcript[j];
        const curDur = (seg.start + (seg.duration || 2)) - startSec;
        if (curDur > neededTier.max) break;

        combinedSegments.push(seg);
        const segText = seg.text || '';
        if (/\[(हंसी|हँसी|laughter)\]/i.test(segText)) markerPoints += 20;
        if (/\[(हौसला बढ़ाने की आवाज़|प्रशंसा|तालियां|applause)\]/i.test(segText)) markerPoints += 25;

        const isNaturalEnd = curDur >= neededTier.min && (
          /\[(हंसी|laughter|हौसला|applause)\]/i.test(segText) ||
          /[.!?।]$/.test(segText.trim()) ||
          (j < transcript.length - 1 && transcript[j + 1].start - (seg.start + (seg.duration || 2)) > 0.6)
        );

        if (isNaturalEnd) {
          const endSec = Math.ceil(seg.start + (seg.duration || 2));
          const isOverlapping = finalClips.some(e => startSec < e.end && endSec > e.start);
          if (!isOverlapping) {
            const rawWords = combinedSegments.map(s => s.text).join(' ').split(/\s+/).filter(Boolean);
            const meaningfulWords = rawWords.filter(w => !/^(aur|to|ki|hai|hain|mein|se|ne|ko|ka|ke)$/i.test(w)).slice(0, 5).join(' ');
            candidates.push({
              title: devanagariToHinglish(meaningfulWords) || `Viral Highlight (${Math.floor(startSec / 60)}m)`,
              description: `Complete conversation discussing "${devanagariToHinglish(rawWords.slice(0, 10).join(' '))}..."`,
              start: startSec,
              end: endSec,
              duration: endSec - startSec,
              viralScore: 86
            });
            break;
          }
        }
      }
      if (candidates.length >= missingCount) break;
    }
    finalClips.push(...candidates);
  }

  finalClips.sort((a, b) => a.start - b.start);

  if (finalClips.length > 0) {
    return finalClips.slice(0, targetClips);
  }

  // Final fallback: Ensure targetClips are always returned
  const fallbackList = [];
  const targetD = Math.round((userMin + userMax) / 2);
  const step = Math.max(userMin, Math.floor((effectiveDuration - introCutoff - 20) / targetClips));
  for (let i = 0; i < targetClips; i++) {
    const s = Math.floor(introCutoff + (i * step));
    const e = Math.min(Math.floor(effectiveDuration), s + targetD);
    fallbackList.push({
      title: `${videoMeta.title ? devanagariToHinglish(videoMeta.title.slice(0, 30)) : 'Viral Scene'} - Part ${i + 1}`,
      description: 'Captured complete conversational segment from the video.',
      start: s,
      end: e,
      duration: Math.max(userMin, e - s),
      viralScore: 88 - (i * 2)
    });
  }
  return fallbackList;
}

/**
 * AI Provider caller implementations
 */
async function callGroq(apiKey, model, systemPrompt, userPrompt) {
  const targetModel = model || 'openai/gpt-oss-120b';
  console.log(`AI ANALYZER: Using Groq API with model ${targetModel}`);
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok && response.status === 400) {
    const errText = await response.text();
    if (errText.includes('response_format') || errText.includes('json_object')) {
      console.log(`Groq model ${targetModel} does not support json_object mode, retrying with raw prompt...`);
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: targetModel,
          messages: [
            { role: 'system', content: `${systemPrompt}\nIMPORTANT: Respond with pure JSON only, no markdown formatting.` },
            { role: 'user', content: userPrompt }
          ]
        })
      });
    } else {
      throw new Error(`Groq API failed (${response.status}): ${errText}`);
    }
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API failed (${response.status}): ${errText}`);
  }

  const resJson = await response.json();
  const text = resJson.choices?.[0]?.message?.content;
  return JSON.parse(cleanJsonString(text));
}

async function callMistral(apiKey, model, systemPrompt, userPrompt) {
  console.log(`AI ANALYZER: Using Mistral API with model ${model}`);
  const url = 'https://api.mistral.ai/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'mistral-small-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Mistral API failed (${response.status}): ${errText}`);
  }

  const resJson = await response.json();
  const text = resJson.choices?.[0]?.message?.content;
  return JSON.parse(cleanJsonString(text));
}

async function callGemini(apiKey, model, prompt) {
  console.log(`AI ANALYZER: Using Gemini API with model ${model}`);
  const selectedModel = model || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API failed (${response.status}): ${errText}`);
  }

  const resJson = await response.json();
  const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(cleanJsonString(text));
}

async function callOpenAI(apiKey, model, systemPrompt, userPrompt) {
  console.log(`AI ANALYZER: Using OpenAI API with model ${model}`);
  const url = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API failed (${response.status}): ${errText}`);
  }

  const resJson = await response.json();
  const text = resJson.choices?.[0]?.message?.content;
  return JSON.parse(cleanJsonString(text));
}

function postProcessClips(clips, videoDuration, targetClips = 5, userMin = 30, userMax = 60) {
  if (!Array.isArray(clips)) return [];

  const effectiveDuration = Math.max(180, Number(videoDuration) || 600);
  const minDur = Math.max(10, Math.min(180, parseInt(userMin, 10) || 30));
  const maxDur = Math.max(minDur + 5, Math.min(300, parseInt(userMax, 10) || 60));
  const midDur = Math.round((minDur + maxDur) / 2);

  const processed = [];
  for (const c of clips) {
    if (!c || typeof c.start !== 'number' || typeof c.end !== 'number') continue;

    let start = Math.max(0, Math.floor(c.start));
    let end = Math.min(Math.floor(effectiveDuration), Math.ceil(c.end));

    if (end <= start) {
      end = Math.min(Math.floor(effectiveDuration), start + midDur);
    }
    let duration = end - start;

    // Enforce user specified minDuration and maxDuration bounds strictly
    if (duration < minDur) {
      end = Math.min(Math.floor(effectiveDuration), start + minDur);
      duration = end - start;
    } else if (duration > maxDur) {
      end = start + maxDur;
      duration = end - start;
    }

    if (duration >= Math.max(10, minDur - 4)) {
      processed.push({
        title: devanagariToHinglish(c.title) || `Viral Moment (${Math.floor(start / 60)}m)`,
        description: devanagariToHinglish(c.description) || 'Complete scene with meaningful dialogues, strong hook, and full punchline/takeaway resolution.',
        start,
        end,
        duration,
        viralScore: typeof c.viralScore === 'number' ? c.viralScore : (typeof c.viral_score === 'number' ? c.viral_score : 90)
      });
    }
  }

  // Sort by viralScore descending
  processed.sort((a, b) => (b.viralScore || 0) - (a.viralScore || 0));

  // Remove overlapping clips that start within 25 seconds of each other
  const uniqueClips = [];
  for (const clip of processed) {
    const isDuplicate = uniqueClips.some((existing) => 
      Math.abs(existing.start - clip.start) < Math.max(15, Math.round(minDur * 0.6)) || 
      (clip.start < existing.end && clip.end > existing.start)
    );
    if (!isDuplicate) {
      uniqueClips.push(clip);
    }
  }

  // Ensure a healthy mix across duration buckets
  if (uniqueClips.length > targetClips) {
    const span = maxDur - minDur;
    const shortThreshold = Math.round(minDur + span * 0.4);
    const medThreshold = Math.round(minDur + span * 0.75);

    const shortClips = uniqueClips.filter((c) => c.duration <= shortThreshold);
    const medClips = uniqueClips.filter((c) => c.duration > shortThreshold && c.duration <= medThreshold);
    const longClips = uniqueClips.filter((c) => c.duration > medThreshold);

    const balanced = [];
    const maxRounds = targetClips;
    for (let r = 0; r < maxRounds && balanced.length < targetClips; r++) {
      if (shortClips.length > 0 && balanced.length < targetClips) balanced.push(shortClips.shift());
      if (medClips.length > 0 && balanced.length < targetClips) balanced.push(medClips.shift());
      if (longClips.length > 0 && balanced.length < targetClips) balanced.push(longClips.shift());
    }

    for (const c of uniqueClips) {
      if (balanced.length >= targetClips) break;
      if (!balanced.includes(c)) balanced.push(c);
    }
    balanced.sort((a, b) => a.start - b.start);
    return balanced;
  }

  uniqueClips.sort((a, b) => a.start - b.start);
  return uniqueClips.slice(0, targetClips);
}

/**
 * Identifies high-retention, contextually complete viral clips from a video transcript.
 * Strictly filters out non-relevant content (intros, sponsor reads, filler).
 * Extracts exactly targetClips (1 to 20) top viral moments across the FULL video timeline,
 * conforming strictly to user-requested minDuration and maxDuration.
 */
export async function identifyViralClips(transcript, videoDuration, aiConfig = {}, videoMeta = {}) {
  const targetClips = Math.min(20, Math.max(1, parseInt(videoMeta.targetClips, 10) || 5));
  const userMin = Math.max(10, Math.min(180, parseInt(videoMeta.minDuration, 10) || 30));
  const userMax = Math.max(userMin + 5, Math.min(300, parseInt(videoMeta.maxDuration, 10) || 60));
  const effectiveDuration = Math.max(180, Number(videoDuration) || 600);
  const meta = { ...videoMeta, targetClips, minDuration: userMin, maxDuration: userMax };

  // If transcript is empty, directly generate timeline-distributed viral clips without failing
  if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
    console.log('AI ANALYZER: No transcript available; generating timeline-distributed viral moments.');
    return generateIntelligentFallbackClips([], effectiveDuration, meta);
  }

  const provider = aiConfig.provider || 'mistral';
  const groqKey = aiConfig.groqKey || process.env.GROQ_API_KEY;
  const mistralKey = aiConfig.mistralKey || process.env.MISTRAL_API_KEY;
  const geminiKey = aiConfig.geminiKey || process.env.GEMINI_API_KEY;
  const openaiKey = aiConfig.openaiKey || process.env.OPENAI_API_KEY;

  if (!groqKey && !mistralKey && !geminiKey && !openaiKey) {
    return generateIntelligentFallbackClips(transcript, effectiveDuration, meta);
  }

  const videoTitle = videoMeta.title || 'Untitled Video';
  const channelName = videoMeta.channel || 'Creator';

  // Sample across full video duration so AI is not restricted to the first few minutes
  let transcriptContext;
  if (!transcript || transcript.length <= 350) {
    transcriptContext = transcript || [];
  } else {
    const numBuckets = Math.min(45, Math.floor(transcript.length / 8));
    const bucketStep = transcript.length / numBuckets;
    const sampled = [];
    for (let b = 0; b < numBuckets; b++) {
      const idx = Math.floor(b * bucketStep);
      sampled.push(...transcript.slice(idx, idx + 4));
    }
    transcriptContext = sampled;
  }

  const systemPrompt = `You are a world-class viral video editor and content strategist specializing in YouTube Shorts, TikTok, and Instagram Reels.
Your objective: Extract ONLY THE MOST RELEVANT, HIGH-RETENTION, COMPLETE STANDALONE CONVERSATIONS that get millions of views.
You must return strictly a JSON object with a "clips" array.`;

  const prompt = `You are curating EXACTLY ${targetClips} (up to 20) of the BEST, MOST VIRAL, AND 100% RELEVANT moments from this video.

VIDEO CONTEXT:
- Title: "${videoTitle}"
- Channel: "${channelName}"
- Duration: ${Math.floor(effectiveDuration)} seconds (${Math.floor(effectiveDuration / 60)} minutes)
- Target Number of Clips: Exactly ${targetClips} clips (Max: 20)
- Target Duration Bounds: Between ${userMin}s and ${userMax}s

TIMELINE TRANSCRIPT SAMPLES (with start timestamp in seconds):
${JSON.stringify(transcriptContext)}

STRICT VIRAL RELEVANCE RULES (MANDATORY):
1. EXPLORE THE ENTIRE VIDEO TIMELINE:
   - Starting from the start of the video is NOT compulsory! Skip intro greetings, theme music, and initial channel fluff.
   - Choose the funniest, most shocking, or most interesting moments from throughout the ENTIRE video (from 0s to ${Math.floor(effectiveDuration)}s).
   - Ensure the clips are distributed across different parts of the episode/video.

2. DIVERSE MIX OF DURATIONS FROM ${userMin} SECONDS TO ${userMax} SECONDS (${userMin}s to ${userMax}s):
   - CRITICAL REQUIREMENT: Deliver clips whose duration is STRICTLY between ${userMin}s and ${userMax}s ("end" - "start" >= ${userMin} and <= ${userMax})!
   - Every clip must be a 100% COMPLETE CONVERSATION with its setup, banter, and final punchline/conclusion without cutting off mid-sentence.
   - Do NOT select moments shorter than ${userMin}s or longer than ${userMax}s.
   - "start": Timestamp in seconds of the opening hook sentence.
   - "end": Timestamp in seconds of the final punchline, reaction, or takeaway word.

3. TITLES (HINGLISH / ENGLISH ROMAN SCRIPT):
   - "title": High-CTR curiosity hook title (4 to 7 words) written in English or Hinglish Roman script (NO Devanagari).
   - "description": 1-2 punchy sentences in Roman script explaining the core takeaway or punchline.
   - "viralScore": Score from 1 to 100 indicating viral potential.

OUTPUT FORMAT:
Return a JSON object containing a "clips" array with exactly ${targetClips} top-ranked viral moments sorted by viralScore descending:
{
  "clips": [
    {
      "title": "String (Curiosity Hook in Roman script)",
      "description": "String (Summary of why this dialogue is captivating)",
      "start": 120.0,
      "end": 185.0,
      "viralScore": 95
    }
  ]
}

Respond ONLY with valid JSON.`;

  // Create list of execution providers ordered by user's active choice
  const providersToTry = [];
  if (provider === 'groq' && groqKey) providersToTry.push('groq');
  else if (provider === 'mistral' && mistralKey) providersToTry.push('mistral');
  else if (provider === 'gemini' && geminiKey) providersToTry.push('gemini');
  else if (provider === 'openai' && openaiKey) providersToTry.push('openai');

  // Add remaining available providers as fallbacks
  if (groqKey && !providersToTry.includes('groq')) providersToTry.push('groq');
  if (mistralKey && !providersToTry.includes('mistral')) providersToTry.push('mistral');
  if (geminiKey && !providersToTry.includes('gemini')) providersToTry.push('gemini');
  if (openaiKey && !providersToTry.includes('openai')) providersToTry.push('openai');

  for (const p of providersToTry) {
    try {
      let rawResult;
      if (p === 'groq') {
        rawResult = await callGroq(groqKey, aiConfig.groqModel, systemPrompt, prompt);
      } else if (p === 'mistral') {
        rawResult = await callMistral(mistralKey, aiConfig.mistralModel, systemPrompt, prompt);
      } else if (p === 'gemini') {
        rawResult = await callGemini(geminiKey, aiConfig.geminiModel, prompt);
      } else if (p === 'openai') {
        rawResult = await callOpenAI(openaiKey, aiConfig.openaiModel, systemPrompt, prompt);
      }

      const rawClips = normalizeClipsOutput(rawResult);
      if (rawClips && rawClips.length > 0) {
        const validatedClips = postProcessClips(rawClips, effectiveDuration, targetClips, userMin, userMax);
        if (validatedClips.length > 0) {
          console.log(`AI CURATOR: Successfully extracted ${validatedClips.length} relevant clips via ${p} (Duration: ${userMin}s-${userMax}s).`);
          return validatedClips;
        }
      }
    } catch (e) {
      console.error(`AI Provider (${p}) failed:`, e.message);
    }
  }

  console.warn('All configured AI providers failed. Falling back to intelligent semantic chunker.');
  return generateIntelligentFallbackClips(transcript, effectiveDuration, meta);
}

/**
 * Transliterates Hindi Devanagari transcript into modern, clean Hinglish (Roman script)
 * Uses conversational Romanized Hindi as seen on YouTube/Instagram subtitles.
 * ALWAYS guarantees 100% Roman script output, falling back to deterministic transliterator if AI fails.
 */
export async function transliterateHindiToHinglish(transcript, aiConfig = {}) {
  if (!Array.isArray(transcript) || transcript.length === 0) {
    return [];
  }

  const provider = aiConfig.provider || 'mistral';
  const groqKey = aiConfig.groqKey || process.env.GROQ_API_KEY;
  const mistralKey = aiConfig.mistralKey || process.env.MISTRAL_API_KEY;
  const geminiKey = aiConfig.geminiKey || process.env.GEMINI_API_KEY;
  const openaiKey = aiConfig.openaiKey || process.env.OPENAI_API_KEY;

  // Process in small batches (max 30 segments) to prevent LLM token overflow
  const maxBatch = 35;
  if (transcript.length <= maxBatch && (groqKey || mistralKey || geminiKey || openaiKey)) {
    const systemPrompt = `You are an expert Hindi to Hinglish (Roman script Hindi) transliterator for YouTube Shorts and Instagram Reels. Output strictly JSON.`;
    const prompt = `Transliterate the following transcript segments from Hindi (Devanagari script) into natural, modern colloquial Hinglish (Hindi written in the English/Latin alphabet, exactly as used in YouTube Shorts, Instagram Reels subtitles, and WhatsApp texting).

RULES:
1. Do NOT translate the meaning into English. Only transliterate the Hindi phonetic sounds into modern Roman script.
   Examples:
   - "नमस्ते दोस्तों, आज मैं आपको बताऊंगा" -> "Namaste dosto, aaj main aapko bataunga"
   - "यह बहुत ही मजेदार बात है" -> "Yeh bohot hi mazedaar baat hai"
   - "डॉक्टर ने बोला कि सब ठीक है" -> "Doctor ne bola ki sab theek hai"
2. Keep standard English words (e.g. "doctor", "video", "subscribe", "business", "phone", "school", "hospital", "money", "ready", "show") in their correct English spelling.
3. Keep the exact timestamps ("start", "duration") unchanged for every single segment.

Segments to transliterate:
${JSON.stringify(transcript)}

Return a JSON object with a "transcript" array containing the exact same number of segment objects with transliterated "text".`;

    const providersToTry = [];
    if (provider === 'groq' && groqKey) providersToTry.push('groq');
    else if (provider === 'mistral' && mistralKey) providersToTry.push('mistral');
    else if (provider === 'gemini' && geminiKey) providersToTry.push('gemini');
    else if (provider === 'openai' && openaiKey) providersToTry.push('openai');

    if (groqKey && !providersToTry.includes('groq')) providersToTry.push('groq');
    if (mistralKey && !providersToTry.includes('mistral')) providersToTry.push('mistral');
    if (geminiKey && !providersToTry.includes('gemini')) providersToTry.push('gemini');
    if (openaiKey && !providersToTry.includes('openai')) providersToTry.push('openai');

    for (const p of providersToTry) {
      try {
        let rawResult;
        if (p === 'groq') {
          rawResult = await callGroq(groqKey, aiConfig.groqModel, systemPrompt, prompt);
        } else if (p === 'mistral') {
          rawResult = await callMistral(mistralKey, aiConfig.mistralModel, systemPrompt, prompt);
        } else if (p === 'gemini') {
          rawResult = await callGemini(geminiKey, aiConfig.geminiModel, prompt);
        } else if (p === 'openai') {
          rawResult = await callOpenAI(openaiKey, aiConfig.openaiModel, systemPrompt, prompt);
        }

        let parsed = null;
        if (Array.isArray(rawResult)) parsed = rawResult;
        else if (rawResult && Array.isArray(rawResult.transcript)) parsed = rawResult.transcript;
        else if (rawResult && Array.isArray(rawResult.segments)) parsed = rawResult.segments;

        if (parsed && parsed.length === transcript.length) {
          // Verify it does not contain Devanagari
          const hasDevanagari = /[\u0900-\u097F]/.test(parsed.map((s) => s.text).join(' '));
          if (!hasDevanagari) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn(`Transliteration provider (${p}) failed:`, e.message);
      }
    }
  }

  // Guaranteed fallback: Deterministic phonetic transliterator
  return transcript.map((s) => ({
    ...s,
    text: devanagariToHinglish(s.text)
  }));
}

/**
 * Translates transcript segments into natural, fluent English for global subtitles
 * Strictly preserves segment start and duration timings.
 */
export async function translateTranscriptToEnglish(transcript, aiConfig = {}) {
  const provider = aiConfig.provider || 'mistral';
  const groqKey = aiConfig.groqKey || process.env.GROQ_API_KEY;
  const mistralKey = aiConfig.mistralKey || process.env.MISTRAL_API_KEY;
  const geminiKey = aiConfig.geminiKey || process.env.GEMINI_API_KEY;
  const openaiKey = aiConfig.openaiKey || process.env.OPENAI_API_KEY;

  if (!groqKey && !mistralKey && !geminiKey && !openaiKey) {
    return transcript;
  }

  const systemPrompt = `You are an expert subtitle translator specializing in concise, punchy English captions for short-form viral videos. Output strictly JSON.`;
  const prompt = `Translate the following transcript segments into clear, fluent, natural conversational English suitable for short-form video subtitles (YouTube Shorts, Reels, TikTok).

RULES:
1. Translate the meaning accurately into concise, modern, punchy English.
2. Keep sentences short and punchy so they read smoothly as on-screen subtitles.
3. Keep the exact timestamps ("start", "duration") unchanged for every single segment.

Segments to translate:
${JSON.stringify(transcript.slice(0, 1200))}

Return a JSON object with a "transcript" array containing the exact same number of segment objects with translated English "text".`;

  const providersToTry = [];
  if (provider === 'groq' && groqKey) providersToTry.push('groq');
  else if (provider === 'mistral' && mistralKey) providersToTry.push('mistral');
  else if (provider === 'gemini' && geminiKey) providersToTry.push('gemini');
  else if (provider === 'openai' && openaiKey) providersToTry.push('openai');

  if (groqKey && !providersToTry.includes('groq')) providersToTry.push('groq');
  if (mistralKey && !providersToTry.includes('mistral')) providersToTry.push('mistral');
  if (geminiKey && !providersToTry.includes('gemini')) providersToTry.push('gemini');
  if (openaiKey && !providersToTry.includes('openai')) providersToTry.push('openai');

  for (const p of providersToTry) {
    try {
      let rawResult;
      if (p === 'groq') {
        rawResult = await callGroq(groqKey, aiConfig.groqModel, systemPrompt, prompt);
      } else if (p === 'mistral') {
        rawResult = await callMistral(mistralKey, aiConfig.mistralModel, systemPrompt, prompt);
      } else if (p === 'gemini') {
        rawResult = await callGemini(geminiKey, aiConfig.geminiModel, prompt);
      } else if (p === 'openai') {
        rawResult = await callOpenAI(openaiKey, aiConfig.openaiModel, systemPrompt, prompt);
      }

      if (Array.isArray(rawResult)) return rawResult;
      if (rawResult && Array.isArray(rawResult.transcript)) return rawResult.transcript;
      if (rawResult && Array.isArray(rawResult.segments)) return rawResult.segments;
    } catch (e) {
      console.error(`Translation provider (${p}) failed:`, e.message);
    }
  }

  return transcript;
}
