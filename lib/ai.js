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

/**
 * Intelligent semantic fallback generator.
 * Analyzes speech pause boundaries and sentence markers to form coherent, self-contained segments.
 */
function generateIntelligentFallbackClips(transcript, videoDuration, videoMeta = {}) {
  console.log('Generating intelligent semantic fallback clips from transcript...');
  if (!transcript || transcript.length === 0) {
    // Basic time slicing if no transcript at all
    const clips = [];
    const clipLength = 30;
    const totalClips = Math.min(8, Math.max(1, Math.floor(videoDuration / clipLength)));
    for (let i = 0; i < totalClips; i++) {
      const start = Math.floor(i * clipLength);
      const end = Math.min(Math.floor(videoDuration), start + clipLength);
      if (end - start >= 15) {
        clips.push({
          title: `Key Highlight #${i + 1} (${start}s - ${end}s)`,
          description: `Extracted highlight segment capturing conversational moment from ${start}s to ${end}s.`,
          start,
          end,
        });
      }
    }
    return clips;
  }

  const clips = [];
  let currentGroup = [];
  let groupStartTime = transcript[0].start || 0;

  for (let i = 0; i < transcript.length; i++) {
    const seg = transcript[i];
    const segText = seg.text ? seg.text.trim() : '';
    const segStart = typeof seg.start === 'number' ? seg.start : 0;
    const segDuration = typeof seg.duration === 'number' ? seg.duration : 2;
    const segEnd = segStart + segDuration;

    if (currentGroup.length === 0) {
      groupStartTime = segStart;
    }

    currentGroup.push(seg);
    const currentDuration = segEnd - groupStartTime;

    // Check if this segment represents a natural pause or conversational boundary
    const isNextFar = i < transcript.length - 1 && (transcript[i + 1].start - segEnd > 1.2);
    const endsWithPunctuation = /[.?!।]$/.test(segText) || /^(khelna|hota hai|dekho|suno|kya|aur|phir|to)/i.test(segText);
    const hasLaughOrMusic = /\[(sangeet|music|applause|laughter|taliyan)\]/i.test(segText);

    // Natural complete scene criteria: between 30 and 45 seconds long (target 35-40s) ending at a natural boundary
    const isGoodLength = currentDuration >= 30 && (currentDuration <= 44 || endsWithPunctuation || isNextFar || hasLaughOrMusic);

    if (isGoodLength || currentDuration >= 45 || i === transcript.length - 1) {
      const combinedText = currentGroup.map((s) => s.text).join(' ');
      const words = combinedText.split(/\s+/).filter(Boolean);
      
      // Derive a meaningful title from the first 5-6 informative words
      const cleanTitleWords = words
        .filter((w) => !/^(aur|to|ki|hai|hain|mein|se|ne|ko|ka|ke|ye|woh|the|and|is|a|an|the|of|in|to)$/i.test(w))
        .slice(0, 5)
        .join(' ');

      const title = cleanTitleWords.length > 3 
        ? `${cleanTitleWords.charAt(0).toUpperCase() + cleanTitleWords.slice(1)}...` 
        : `Moment #${clips.length + 1} (${Math.floor(groupStartTime)}s - ${Math.floor(segEnd)}s)`;

      clips.push({
        title,
        description: `Self-contained thought segment discussing "${words.slice(0, 12).join(' ')}..."`,
        start: Math.floor(groupStartTime),
        end: Math.ceil(segEnd),
      });

      currentGroup = [];
      if (clips.length >= 15) break;
    }
  }

  return clips.length > 0 ? clips : [{
    title: videoMeta.title ? `Highlight: ${videoMeta.title.slice(0, 30)}` : 'Full Video Highlight',
    description: 'Captured primary conversational segment from the video.',
    start: 0,
    end: Math.min(Math.floor(videoDuration), 35)
  }];
}

/**
 * AI Provider caller implementations
 */
async function callGroq(apiKey, model, systemPrompt, userPrompt) {
  const targetModel = model || 'openai/gpt-oss-120b';
  console.log(`AI ANALYZER: Using Groq API with model ${targetModel}`);
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  // Try first with response_format json_object
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

  // If response_format is unsupported by the specific model, retry without response_format
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
      response_format: { type: 'json_object' }
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

/**
 * Normalizes clip output to ensure it is always an Array of clip objects
 */
function normalizeClipsOutput(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.clips)) return result.clips;
  if (result && Array.isArray(result.shorts)) return result.shorts;
  if (result && Array.isArray(result.segments)) return result.segments;
  if (typeof result === 'object' && result !== null) {
    const vals = Object.values(result).filter((v) => v && typeof v === 'object' && (v.start !== undefined || v.title));
    if (vals.length > 0) return vals;
  }
  return [];
}

/**
 * Filters and validates clips to ensure narrative integrity and correct timing.
 */
function postProcessClips(clips, videoDuration) {
  if (!Array.isArray(clips)) return [];

  const processed = [];
  for (const c of clips) {
    if (!c || typeof c.start !== 'number' || typeof c.end !== 'number') continue;

    let start = Math.max(0, Math.floor(c.start));
    let end = Math.min(Math.floor(videoDuration), Math.ceil(c.end));

    if (end <= start) continue;
    let duration = end - start;

    // Ensure valid duration between 25s and 45s (target 35-40s)
    if (duration < 25) {
      end = Math.min(Math.floor(videoDuration), start + 35);
      duration = end - start;
    } else if (duration > 45) {
      end = start + 42;
      duration = end - start;
    }

    if (duration >= 20) {
      processed.push({
        title: c.title || `Viral Short (${start}s - ${end}s)`,
        description: c.description || 'Complete scene with meaningful dialogues and full conversational resolution.',
        start,
        end,
        duration,
      });
    }
  }

  // Remove overlapping clips that start within 10 seconds of each other to ensure scene variety
  const uniqueClips = [];
  for (const clip of processed) {
    const isDuplicate = uniqueClips.some((existing) => Math.abs(existing.start - clip.start) < 10);
    if (!isDuplicate) {
      uniqueClips.push(clip);
    }
  }

  return uniqueClips;
}

/**
 * Identifies high-retention, contextually complete viral clips from a video transcript.
 * Detects genre (comedy/standup, educational/tutorial, podcast/interview, storytelling)
 * and extracts fully self-contained moments (complete joke with punchline, complete concept with takeaway).
 */
export async function identifyViralClips(transcript, videoDuration, aiConfig = {}, videoMeta = {}) {
  const provider = aiConfig.provider || 'mistral';
  const groqKey = aiConfig.groqKey || process.env.GROQ_API_KEY;
  const mistralKey = aiConfig.mistralKey || process.env.MISTRAL_API_KEY;
  const geminiKey = aiConfig.geminiKey || process.env.GEMINI_API_KEY;
  const openaiKey = aiConfig.openaiKey || process.env.OPENAI_API_KEY;

  if (!groqKey && !mistralKey && !geminiKey && !openaiKey) {
    return generateIntelligentFallbackClips(transcript, videoDuration, videoMeta);
  }

  const videoTitle = videoMeta.title || 'Untitled Video';
  const channelName = videoMeta.channel || 'Creator';

  const systemPrompt = `You are a master viral video editor and content strategist specializing in YouTube Shorts, TikTok, and Instagram Reels.
Your expertise is finding 100% COMPLETE SCENES WITH MEANINGFUL DIALOGUES that never cut off conversations mid-thought.
You must output strictly a JSON object with a "clips" array.`;

  const prompt = `You are editing a video into viral, high-retention standalone vertical Shorts.
Each clip should be around 30 to 45 seconds (optimal 35-40 seconds) to ensure a COMPLETE SCENE with MEANINGFUL DIALOGUES.

VIDEO CONTEXT:
- Title: "${videoTitle}"
- Channel: "${channelName}"
- Duration: ${Math.floor(videoDuration)} seconds

TRANSCRIPT SEGMENTS (with start timestamp in seconds):
${JSON.stringify(transcript.slice(0, 1600))}

CRITICAL RULES FOR SCENE & DIALOGUE COMPLETENESS (STRICT):
1. COMPLETE SCENE & ZERO ABRUPT CUTS:
   - DO NOT CUT THE CONVERSATION. The clip MUST be a complete scene where all dialogue is fully delivered from beginning to end.
   - START: Must begin precisely when a speaker opens a topic, asks a question, starts a story/joke, or makes an opening remark. Never start mid-sentence!
   - BODY: Must include the entire back-and-forth exchange, context, reasoning, and escalation.
   - END: Must finish precisely when the thought, answer, punchline, or takeaway is fully concluded. Never cut off before the final sentence or reaction!

2. GENRE-SPECIFIC COMPLETE SCENES:
   - IF COMEDY / STANDUP / HUMOR: Capture the ENTIRE JOKE (Setup -> Context -> Misdirection -> Punchline -> Reaction). A 35-40s duration gives the joke full timing to land. Never cut before the punchline or start after the setup!
   - IF EDUCATIONAL / TECH / EXPLAINER: Capture a WHOLE CONCEPT (Problem/Question -> In-depth explanation/solution -> Final "Aha!" conclusion or tip).
   - IF PODCAST / INTERVIEW / STORY: Capture a COMPLETE ANECDOTE or TOPIC DEBATE (Hook question -> Candid answer -> Mic-drop conclusion).

3. DURATION SPECIFICATION (35-40 SECONDS TARGET):
   - Target duration: Strictly 30 to 45 seconds (optimal: 35 to 40 seconds).
   - "start": Timestamp in seconds of the opening word of the scene.
   - "end": Timestamp in seconds where the final dialogue/punchline/reaction finishes (start + 30 to 45s).

4. TITLES & DESCRIPTIONS:
   - "title": High-CTR curiosity hook title (4 to 7 words) representing the scene.
   - "description": 1-2 sentences explaining what happens in this scene and why the dialogue is captivating.

OUTPUT FORMAT:
Return a JSON object containing a "clips" array with 8 to 15 top-ranked viral moments:
{
  "clips": [
    {
      "title": "String (High-CTR Hook)",
      "description": "String (Summary of the full scene dialogue and punchline/takeaway)",
      "start": 120.0,
      "end": 158.5
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
        const validatedClips = postProcessClips(rawClips, videoDuration);
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
  return generateIntelligentFallbackClips(transcript, videoDuration, videoMeta);
}

/**
 * Transliterates Hindi Devanagari transcript into Hinglish (Roman script)
 */
export async function transliterateHindiToHinglish(transcript, aiConfig = {}) {
  const provider = aiConfig.provider || 'mistral';
  const groqKey = aiConfig.groqKey || process.env.GROQ_API_KEY;
  const mistralKey = aiConfig.mistralKey || process.env.MISTRAL_API_KEY;
  const geminiKey = aiConfig.geminiKey || process.env.GEMINI_API_KEY;
  const openaiKey = aiConfig.openaiKey || process.env.OPENAI_API_KEY;

  if (!groqKey && !mistralKey && !geminiKey && !openaiKey) {
    return transcript;
  }

  const systemPrompt = `You are an expert Hindi to Hinglish (Roman script Hindi) transliterator. Output strictly JSON.`;
  const prompt = `Transliterate the following transcript segments from Hindi (Devanagari script) into natural, modern Hinglish (Hindi written in the English/Latin alphabet, exactly as Indians text on WhatsApp and subtitles on YouTube/Instagram).

RULES:
1. Do NOT translate into English meaning. Only transliterate the Hindi phonetic sounds into Roman script (e.g., "नमस्ते आप कैसे हैं" -> "namaste aap kaise hain", "डॉक्टर ने पट्टी हटाई" -> "doctor ne patti hatai").
2. Keep the exact timestamps ("start", "duration") unchanged for every segment.
3. Keep English words (like "doctor", "clinic", "birthday", "cake", "light") as English words.

Segments to transliterate:
${JSON.stringify(transcript.slice(0, 1000))}

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

      if (Array.isArray(rawResult)) return rawResult;
      if (rawResult && Array.isArray(rawResult.transcript)) return rawResult.transcript;
      if (rawResult && Array.isArray(rawResult.segments)) return rawResult.segments;
    } catch (e) {
      console.error(`Transliteration provider (${p}) failed:`, e.message);
    }
  }

  return transcript;
}
