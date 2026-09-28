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

import { devanagariToHinglish, hasDevanagari, transliterateTranscript } from './transliterate.js';
export { devanagariToHinglish, hasDevanagari, transliterateTranscript };

/**
 * Intelligent semantic clip discovery across the ENTIRE video.
 * Does NOT start at 0:00 (skips opening fluff).
 * Discovers complete, meaningful conversations up to 1 minute 30 seconds (up to 90s).
 */
function generateIntelligentFallbackClips(transcript, videoDuration, videoMeta = {}) {
  const targetClips = Math.min(20, Math.max(1, parseInt(videoMeta.targetClips, 10) || 5));
  console.log(`Intelligent Clip Finder: Scanning entire ${Math.floor(videoDuration)}s video for ${targetClips} viral moments with diverse durations (30s to 1m 30s)...`);

  // Target duration profiles ensuring a vibrant mix from 30s to 1m 30s
  // 1. Short & Punchy: 30s - 48s (quick joke, roast, high-energy punchline)
  // 2. Medium Conversational: 46s - 68s (engaging banter, story exchange)
  // 3. Extended Deep Scene: 66s - 90s (full complete conversational story setup & punchline)
  const durationTiers = [
    { name: 'short', min: 30, max: 48, ideal: 38 },
    { name: 'medium', min: 46, max: 68, ideal: 56 },
    { name: 'long', min: 66, max: 90, ideal: 80 }
  ];

  if (!transcript || transcript.length === 0) {
    const clips = [];
    const targetDurs = [38, 55, 82, 42, 64, 88];
    const startOffset = videoDuration > 180 ? 60 : 0;
    const availableDuration = Math.max(60, videoDuration - startOffset);
    const step = availableDuration / targetClips;

    for (let i = 0; i < targetClips; i++) {
      const start = Math.floor(startOffset + (i * step));
      const clipLength = targetDurs[i % targetDurs.length];
      const end = Math.min(Math.floor(videoDuration), start + clipLength);
      if (end - start >= 28) {
        clips.push({
          title: `Viral Scene #${i + 1} (${Math.floor(start / 60)}m)`,
          description: `Extracted highlight segment capturing complete conversation from ${start}s to ${end}s.`,
          start,
          end,
          duration: end - start,
          viralScore: 88
        });
      }
    }
    return clips;
  }

  // Skip intro greetings and fluff (first 50s for videos > 2 mins)
  const introCutoff = videoDuration > 120 ? 50 : 0;
  const usableDuration = Math.max(60, videoDuration - introCutoff - 25);
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
        if (curDur > 90) break; // Strict upper limit: 1 minute 30 seconds

        combinedSegments.push(seg);
        const segText = seg.text || '';

        // Scoring for viral engagement
        if (/\[(हंसी|हँसी|laughter)\]/i.test(segText)) markerPoints += 20;
        if (/\[(हौसला बढ़ाने की आवाज़|प्रशंसा|तालियां|applause|cheering)\]/i.test(segText)) markerPoints += 25;
        if (/[?!]/i.test(segText)) markerPoints += 10;
        if (/(money|paisa|acting|story|police|girl|problem|roast|funny|boss|job|secret|love)/i.test(segText)) markerPoints += 12;

        // Natural conversation conclusion check
        const isNaturalEnd = curDur >= 28 && (
          /\[(हंसी|हँसी|laughter|हौसला|applause)\]/i.test(segText) ||
          /[.!?।]$/.test(segText.trim()) ||
          (j < transcript.length - 1 && transcript[j + 1].start - (seg.start + (seg.duration || 2)) > 0.6)
        );

        if (isNaturalEnd && curDur >= 28 && curDur <= 90) {
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
    const missingCount = targetClips - finalClips.length;
    const shortCount = finalClips.filter(c => c.duration <= 48).length;
    const medCount = finalClips.filter(c => c.duration > 48 && c.duration <= 68).length;
    const longCount = finalClips.filter(c => c.duration > 68).length;

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

  return [{
    title: videoMeta.title ? devanagariToHinglish(videoMeta.title.slice(0, 30)) : 'Viral Video Highlight',
    description: 'Captured complete conversational segment from the video.',
    start: introCutoff,
    end: Math.min(Math.floor(videoDuration), introCutoff + 45),
    duration: Math.min(Math.floor(videoDuration), introCutoff + 45) - introCutoff,
    viralScore: 85
  }];
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

function postProcessClips(clips, videoDuration, targetClips = 5) {
  if (!Array.isArray(clips)) return [];

  const processed = [];
  for (const c of clips) {
    if (!c || typeof c.start !== 'number' || typeof c.end !== 'number') continue;

    let start = Math.max(0, Math.floor(c.start));
    let end = Math.min(Math.floor(videoDuration), Math.ceil(c.end));

    if (end <= start) continue;
    let duration = end - start;

    // Allow duration between 30s and 90s (up to 1m 30s for complete conversations!)
    if (duration < 30) {
      end = Math.min(Math.floor(videoDuration), start + 35);
      duration = end - start;
    } else if (duration > 90) {
      end = start + 90; // Strictly capped at 1 minute 30 seconds
      duration = end - start;
    }

    if (duration >= 28) {
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
      Math.abs(existing.start - clip.start) < 25 || 
      (clip.start < existing.end && clip.end > existing.start)
    );
    if (!isDuplicate) {
      uniqueClips.push(clip);
    }
  }

  // Ensure a healthy mix across duration buckets (short 30-48s, medium 48-68s, long 68-90s)
  if (uniqueClips.length > targetClips) {
    const shortClips = uniqueClips.filter((c) => c.duration <= 48);
    const medClips = uniqueClips.filter((c) => c.duration > 48 && c.duration <= 68);
    const longClips = uniqueClips.filter((c) => c.duration > 68);

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
 * Extracts exactly targetClips (1 to 20) top viral moments across the FULL video timeline.
 */
export async function identifyViralClips(transcript, videoDuration, aiConfig = {}, videoMeta = {}) {
  const targetClips = Math.min(20, Math.max(1, parseInt(videoMeta.targetClips, 10) || 5));
  const provider = aiConfig.provider || 'mistral';
  const groqKey = aiConfig.groqKey || process.env.GROQ_API_KEY;
  const mistralKey = aiConfig.mistralKey || process.env.MISTRAL_API_KEY;
  const geminiKey = aiConfig.geminiKey || process.env.GEMINI_API_KEY;
  const openaiKey = aiConfig.openaiKey || process.env.OPENAI_API_KEY;

  if (!groqKey && !mistralKey && !geminiKey && !openaiKey) {
    return generateIntelligentFallbackClips(transcript, videoDuration, { ...videoMeta, targetClips });
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
- Duration: ${Math.floor(videoDuration)} seconds (${Math.floor(videoDuration / 60)} minutes)
- Target Number of Clips: Exactly ${targetClips} clips (Max: 20)

TIMELINE TRANSCRIPT SAMPLES (with start timestamp in seconds):
${JSON.stringify(transcriptContext)}

STRICT VIRAL RELEVANCE RULES (MANDATORY):
1. EXPLORE THE ENTIRE VIDEO TIMELINE:
   - Starting from the start of the video is NOT compulsory! Skip intro greetings, theme music, and initial channel fluff.
   - Choose the funniest, most shocking, or most interesting moments from throughout the ENTIRE video (from 0s to ${Math.floor(videoDuration)}s).
   - Ensure the clips are distributed across different parts of the episode/video.

2. DIVERSE MIX OF DURATIONS FROM 30 SECONDS TO 1 MINUTE 30 SECONDS (30s to 90s):
   - CRITICAL REQUIREMENT: Deliver a DIVERSE, BALANCED MIX of clip durations! Do NOT make all clips longer than 1 minute or all clips short.
   - Mix different duration formats:
     * Fast, punchy roasts / jokes / high-energy moments: ~30s to 45s
     * Engaging storytelling / comedic dialogue exchanges: ~45s to 65s
     * Complete deep conversational scenes: ~65s to 90s (Max: 1m 30s)
   - Every clip must be a 100% COMPLETE CONVERSATION with its setup, banter, and final punchline/conclusion without cutting off mid-sentence.
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
        const validatedClips = postProcessClips(rawClips, videoDuration, targetClips);
        if (validatedClips.length > 0) {
          console.log(`AI CURATOR: Successfully extracted ${validatedClips.length} relevant clips via ${p}.`);
          return validatedClips;
        }
      }
    } catch (e) {
      console.error(`AI Provider (${p}) failed:`, e.message);
    }
  }

  console.warn('All configured AI providers failed. Falling back to intelligent semantic chunker.');
  return generateIntelligentFallbackClips(transcript, videoDuration, { ...videoMeta, targetClips });
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
