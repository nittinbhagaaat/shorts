// lib/ai.js

function cleanJsonString(str) {
  if (!str) return '[]';
  
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = str.match(jsonBlockRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  
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

function normalizeClipsResult(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.clips)) return parsed.clips;
    if (Array.isArray(parsed.segments)) return parsed.segments;
    if (Array.isArray(parsed.results)) return parsed.results;
    if (Array.isArray(parsed.data)) return parsed.data;
    
    for (const key of Object.keys(parsed)) {
      if (Array.isArray(parsed[key])) return parsed[key];
    }
  }
  return [];
}

/**
 * Fallback generator to split the video into 20-30s increments if AI fails or returns empty.
 */
function generateMockClips(transcript, videoDuration) {
  console.log('Generating structured fallback clips for duration:', videoDuration);
  let effectiveDuration = videoDuration;
  if (!effectiveDuration || effectiveDuration <= 0) {
    if (transcript && transcript.length > 0) {
      const lastSeg = transcript[transcript.length - 1];
      effectiveDuration = lastSeg.start + (lastSeg.duration || 5);
    } else {
      effectiveDuration = 120;
    }
  }

  const clips = [];
  const clipLength = 28;
  const numClips = Math.max(3, Math.min(6, Math.floor(effectiveDuration / clipLength)));

  for (let i = 0; i < numClips; i++) {
    const start = Math.floor(i * clipLength);
    const end = Math.min(Math.floor(effectiveDuration), start + clipLength);
    if (end > start + 5) {
      clips.push({
        title: `Viral Moment #${i + 1} (${start}s - ${end}s)`,
        description: `High-retention segment curated from ${start} to ${end} seconds.`,
        start,
        end,
      });
    }
  }

  if (clips.length === 0) {
    clips.push(
      { title: 'Viral Opening Hook (0s - 30s)', description: 'Opening high-energy hook from 0 to 30 seconds.', start: 0, end: 30 },
      { title: 'Core Insight (30s - 60s)', description: 'Middle conversational takeaway from 30 to 60 seconds.', start: 30, end: 60 },
      { title: 'Climax & Punchline (60s - 90s)', description: 'Closing revelation from 60 to 90 seconds.', start: 60, end: 90 }
    );
  }

  return clips;
}

/**
 * Dynamically queries available models in user's Groq account
 */
async function getAvailableGroqModels(apiKey) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (res.ok) {
      const data = await res.json();
      const modelList = data.data?.map(m => m.id) || [];
      const chatModels = modelList.filter(id => 
        !id.includes('whisper') && 
        !id.includes('guard') &&
        !id.includes('embed')
      );
      if (chatModels.length > 0) return chatModels;
    }
  } catch (e) {
    console.warn('Failed to fetch Groq models dynamically:', e.message);
  }
  return ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'qwen/qwen3.6-27b', 'llama3-70b-8192', 'llama3-8b-8192'];
}

/**
 * Calls Groq AI using dynamically discovered models from user account
 */
async function callGroqAI(apiKey, prompt) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const availableModels = await getAvailableGroqModels(apiKey);

  const preferredOrder = [
    'llama-3.3-70b-versatile',
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'qwen/qwen3.6-27b',
    'llama3-70b-8192',
    'llama3-8b-8192',
    'groq/compound',
    'groq/compound-mini',
    ...availableModels
  ];

  // Prioritize models that are verified in the user's account
  const modelsToTry = Array.from(new Set([
    ...preferredOrder.filter(m => availableModels.includes(m)),
    ...availableModels,
    'llama-3.3-70b-versatile',
    'openai/gpt-oss-120b'
  ]));

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: 'You are a professional viral video editor that outputs strictly valid JSON arrays or objects.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3
        })
      });

      if (res.ok) {
        const resJson = await res.json();
        const content = resJson.choices?.[0]?.message?.content;
        const cleanJson = cleanJsonString(content);
        return JSON.parse(cleanJson);
      } else {
        const errText = await res.text();
        lastError = new Error(`Groq model ${modelName} failed (${res.status}): ${errText}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All available Groq models failed.');
}

/**
 * Calls Google Gemini AI
 */
async function callGeminiAI(apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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
    throw new Error(`Gemini API request failed (${response.status}): ${errText}`);
  }

  const resJson = await response.json();
  const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  const cleanJson = cleanJsonString(text);
  return JSON.parse(cleanJson);
}

/**
 * Dynamically queries available models in user's Mistral account
 */
async function getAvailableMistralModels(apiKey) {
  try {
    const res = await fetch('https://api.mistral.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (res.ok) {
      const data = await res.json();
      const modelList = data.data?.map(m => m.id) || [];
      const chatModels = modelList.filter(id => !id.includes('embed') && !id.includes('moderation'));
      if (chatModels.length > 0) return chatModels;
    }
  } catch (e) {}
  return ['mistral-small-latest', 'open-mistral-7b', 'mistral-medium-latest'];
}

/**
 * Calls Mistral AI with dynamic account model resolution
 */
async function callMistralAI(apiKey, prompt) {
  const url = 'https://api.mistral.ai/v1/chat/completions';
  const availableModels = await getAvailableMistralModels(apiKey);

  const preferredOrder = [
    'mistral-small-latest',
    'open-mistral-7b',
    'mistral-medium-latest',
    ...availableModels
  ];

  const modelsToTry = Array.from(new Set([
    ...preferredOrder.filter(m => availableModels.includes(m)),
    ...availableModels,
    'mistral-small-latest',
    'open-mistral-7b'
  ]));

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: 'You are a professional video editor helper that outputs only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3
        })
      });

      if (res.ok) {
        const resJson = await res.json();
        const text = resJson.choices?.[0]?.message?.content;
        const cleanJson = cleanJsonString(text);
        return JSON.parse(cleanJson);
      } else {
        const errText = await res.text();
        lastError = new Error(`Mistral model ${modelName} failed (${res.status}): ${errText}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All available Mistral models failed.');
}

/**
 * Calls OpenAI API
 */
async function callOpenAI(apiKey, prompt) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a professional video editor helper that outputs only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API request failed (${response.status}): ${errText}`);
  }

  const resJson = await response.json();
  const text = resJson.choices?.[0]?.message?.content;
  const cleanJson = cleanJsonString(text);
  return JSON.parse(cleanJson);
}

export async function identifyViralClips(transcript, videoDuration, settings = {}) {
  const groqKey = settings.groq_api_key?.trim();
  const geminiKey = settings.gemini_api_key?.trim();
  const mistralKey = settings.mistral_api_key?.trim();
  const openaiKey = settings.openai_api_key?.trim();
  const activeProvider = settings.active_ai_provider || 'groq';

  const prompt = `You are a viral YouTube Shorts and TikTok expert editor.
I will give you a list of transcript segments from a YouTube video, including start timestamps (in seconds) and text.
Your task is to review the transcript and identify the top 10 to 20 most engaging, self-contained segments (each exactly 20 to 30 seconds long) that capture a complete, relevant conversation.

A viral conversational clip must satisfy these rules:
1. Complete & Relevant Conversation: The segment MUST capture a coherent, meaningful exchange or thought. It should start exactly when a topic, question, anecdote, or argument begins, and end exactly when that specific point, punchline, answer, or thought is concluded. Avoid cutting off in the middle of a sentence or leaving a thought unresolved.
2. Strong Hook: The first 3 seconds must have an engaging, bold statement, an interesting question, or high-emotion hook to capture the viewer's attention.
3. Clean Loop/Conclusion: It should end on a strong punchline, key conclusion, or curiosity loop that makes the user want to rewatch.
4. Target Duration: Duration MUST be strictly between 20 and 30 seconds. Do not exceed 30 seconds.

Here is the transcript data as a JSON array of segments:
${JSON.stringify(transcript.slice(0, 1500))}

Output a JSON object with a "clips" array of objects, where each object has:
- "title": Catchy, high-CTR short title (max 6 words).
- "description": 1-2 sentence explanation of why this conversation is highly engaging and likely to go viral.
- "start": Start timestamp (in seconds, must align close to one of the transcript segment start times).
- "end": End timestamp (in seconds, must be start + 20 to 30).

Example output format:
{
  "clips": [
    { "title": "Secret to 10x Growth", "description": "Compelling revelation about exponential leverage.", "start": 45, "end": 72 }
  ]
}
Respond ONLY with valid JSON.`;

  const providers = [
    { id: 'groq', name: 'Groq (Llama 3.3)', key: groqKey, fn: () => callGroqAI(groqKey, prompt) },
    { id: 'gemini', name: 'Google Gemini', key: geminiKey, fn: () => callGeminiAI(geminiKey, prompt) },
    { id: 'mistral', name: 'Mistral AI', key: mistralKey, fn: () => callMistralAI(mistralKey, prompt) },
    { id: 'openai', name: 'OpenAI GPT-4o', key: openaiKey, fn: () => callOpenAI(openaiKey, prompt) },
  ];

  providers.sort((a, b) => (a.id === activeProvider ? -1 : b.id === activeProvider ? 1 : 0));

  for (const provider of providers) {
    if (provider.key) {
      try {
        console.log(`AI CLIP ANALYZER: Attempting with user-configured ${provider.name}...`);
        const result = await provider.fn();
        const normalized = normalizeClipsResult(result);
        if (normalized.length > 0) {
          console.log(`AI CLIP ANALYZER: Successfully generated ${normalized.length} clips using ${provider.name}.`);
          return normalized;
        }
      } catch (err) {
        console.warn(`AI CLIP ANALYZER: ${provider.name} failed:`, err.message);
      }
    }
  }

  console.warn('No valid user-provided AI key available. Falling back to mock clips.');
  return generateMockClips(transcript, videoDuration);
}

export async function transliterateHindiToHinglish(transcript, settings = {}) {
  const groqKey = settings.groq_api_key?.trim();
  const geminiKey = settings.gemini_api_key?.trim();
  const mistralKey = settings.mistral_api_key?.trim();
  const openaiKey = settings.openai_api_key?.trim();
  const activeProvider = settings.active_ai_provider || 'groq';

  const prompt = `You are a Hinglish transliteration expert.
Your task is to take a JSON array of Hindi transcript segments (written in Devanagari script) and transliterate/convert them into Hinglish (Hindi written in the Roman/Latin alphabet. E.g., "नमस्ते दोस्तों" becomes "namaste dosto", "आप कैसे हैं?" becomes "aap kaise hain?", "मैं आज बहुत खुश हूँ" becomes "main aaj bahut khush hoon").
Keep all punctuation, numbers, and emotion intact. Write it using standard English/Latin letters as they would be spoken or typed in a chat.
You MUST preserve the exact same JSON array structure, including the order of objects, and the "start" and "duration" timestamps of each object. Only convert the "text" field of each object. Do not merge, split, or omit any segment.

Here is the transcript data as a JSON array:
${JSON.stringify(transcript)}

Output format:
{
  "segments": [
    { "text": "transliterated text here", "start": 0.0, "duration": 2.5 }
  ]
}
Respond ONLY with valid JSON.`;

  const providers = [
    { id: 'groq', name: 'Groq', key: groqKey, fn: () => callGroqAI(groqKey, prompt) },
    { id: 'gemini', name: 'Gemini', key: geminiKey, fn: () => callGeminiAI(geminiKey, prompt) },
    { id: 'mistral', name: 'Mistral', key: mistralKey, fn: () => callMistralAI(mistralKey, prompt) },
    { id: 'openai', name: 'OpenAI', key: openaiKey, fn: () => callOpenAI(openaiKey, prompt) },
  ];

  providers.sort((a, b) => (a.id === activeProvider ? -1 : b.id === activeProvider ? 1 : 0));

  for (const provider of providers) {
    if (provider.key) {
      try {
        console.log(`HINGLISH TRANSLITERATOR: Attempting with user-configured ${provider.name}...`);
        const result = await provider.fn();
        let segments = Array.isArray(result) ? result : result.segments || result.transcript || result.data;
        if (Array.isArray(segments) && segments.length > 0) {
          console.log(`HINGLISH TRANSLITERATOR: Successfully transliterated ${segments.length} segments using ${provider.name}.`);
          return segments;
        }
      } catch (err) {
        console.warn(`HINGLISH TRANSLITERATOR: ${provider.name} failed:`, err.message);
      }
    }
  }

  console.warn('No user-provided transliteration key available. Returning original transcript.');
  return transcript;
}
