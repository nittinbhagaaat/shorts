// lib/youtubeMetadata.js
import { devanagariToHinglish } from './transliterate.js';

/**
 * Generates rich SEO metadata specifically tailored for YouTube Shorts:
 * - High-CTR Title (with #Shorts tag)
 * - Structured Description with Hook, Summary, Hashtags, and SEO Keywords
 * - Targeted Search Tags (array)
 * - Trending Hashtags (array)
 * - SEO Keyword Phrases (array)
 */
export function generateShortMetadata(clip = {}, videoMeta = {}) {
  const clipTitle = devanagariToHinglish(clip.title || 'Viral Moment')
    .replace(/[.]+$/, '')
    .trim();
  const parentTitle = devanagariToHinglish(videoMeta.title || 'Featured Show').trim();
  const channel = devanagariToHinglish(videoMeta.channel || 'Creator').trim();

  // Extract core keywords from clip dialogue
  const dialogueSample = (clip.transcript || [])
    .slice(0, 8)
    .map(s => devanagariToHinglish(s.text || ''))
    .join(' ')
    .replace(/[\[\]]/g, '')
    .trim();

  // 1. YouTube Short Title (< 95 chars, ending with #Shorts)
  let cleanHook = clipTitle;
  if (!cleanHook || cleanHook.length < 5) {
    cleanHook = 'You won\'t believe this conversation!';
  }
  // Strip existing #Shorts if already present
  cleanHook = cleanHook.replace(/#\w+/g, '').trim();
  if (cleanHook.length > 70) {
    cleanHook = cleanHook.slice(0, 67).trim() + '...';
  }
  const youtubeTitle = `${cleanHook} 😂 #Shorts`;

  // 2. Hashtags for Shorts
  const baseHashtags = ['#Shorts', '#ViralShorts', '#Trending', '#Comedy', '#Funny'];
  const customHashtags = [];
  
  if (channel && channel.length > 2) {
    const cleanChan = channel.replace(/[^a-zA-Z0-9]/g, '');
    if (cleanChan) customHashtags.push(`#${cleanChan}`);
  }
  if (parentTitle && parentTitle.length > 2) {
    const words = parentTitle.split(/\s+/).slice(0, 3).map(w => w.replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean);
    if (words.length > 0) {
      customHashtags.push(`#${words.join('')}`);
    }
  }

  const allHashtags = Array.from(new Set([...baseHashtags, ...customHashtags, '#Entertainment', '#ViralVideo', '#YouTubeShorts'])).slice(0, 8);

  // 3. Search Tags (Comma-separated YouTube algorithm tags)
  const baseTags = [
    'shorts',
    'youtube shorts',
    'viral shorts',
    'comedy shorts',
    'funny moments',
    'trending shorts',
    'best clips',
    'reels',
    'viral video',
    'entertainment'
  ];

  if (channel) baseTags.push(channel.toLowerCase());
  if (parentTitle) {
    baseTags.push(parentTitle.toLowerCase().slice(0, 40));
  }
  const tags = Array.from(new Set(baseTags)).slice(0, 15);

  // 4. SEO Keywords
  const seoKeywords = [
    'viral shorts',
    'funny conversation',
    'standup comedy',
    'best comedy moments',
    'trending video clip',
    'hilarious reactions',
    'comedy video'
  ];

  // 5. Rich YouTube Shorts Description
  const descriptionLines = [
    `🔥 ${cleanHook}`,
    '',
    `Watch this hilarious moment from ${parentTitle || 'the episode'} featuring ${channel || 'special guests'}!`,
    dialogueSample ? `💬 Highlight: "${dialogueSample.slice(0, 120)}..."` : '',
    '',
    '👉 If you enjoyed this clip, LIKE, SHARE & SUBSCRIBE for more daily viral shorts!',
    '',
    '──────────────────────────────',
    '🏷️ HASHTAGS:',
    allHashtags.join(' '),
    '',
    '🔍 SEARCH KEYWORDS / SEO:',
    seoKeywords.join(', '),
    '──────────────────────────────',
    `Original Video: ${videoMeta.url || 'YouTube'}`
  ].filter(line => line !== null && line !== undefined);

  const youtubeDescription = descriptionLines.join('\n');

  return {
    youtubeTitle,
    youtubeDescription,
    tags,
    hashtags: allHashtags,
    seoKeywords
  };
}
