import { YoutubeTranscript } from 'youtube-transcript';

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
    .replace(/&quot;/g, '"');
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

export async function getYouTubeVideoData(url) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }

  // Fetch the watch page HTML with a real-looking user agent to prevent blocks
  const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch YouTube page: ${response.statusText}`);
  }

  const html = await response.text();
  const playerResponse = extractPlayerResponse(html);
  if (!playerResponse) {
    throw new Error('Could not extract player response. YouTube might have changed its page layout or block requested content.');
  }

  const videoDetails = playerResponse.videoDetails || {};
  const captionTracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

  // Extract metadata
  const title = videoDetails.title || 'Untitled Video';
  const channel = videoDetails.author || 'Unknown Channel';
  const duration = parseInt(videoDetails.lengthSeconds || '0', 10);
  const thumbnail = videoDetails.thumbnail?.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return {
    videoId,
    title,
    channel,
    duration,
    thumbnail,
    captionTracks,
  };
}

export async function fetchTranscript(captionTracks, videoId) {
  // If we have videoId, use youtube-transcript package directly as it is much more reliable
  const targetId = videoId || (captionTracks && captionTracks[0] && extractVideoId(captionTracks[0].baseUrl));
  if (!targetId) {
    throw new Error('Video ID is required to fetch transcript.');
  }

  console.log(`Fetching transcript using youtube-transcript for video: ${targetId}`);
  try {
    const rawTranscript = await YoutubeTranscript.fetchTranscript(targetId);
    
    // Map offset/duration from ms to seconds to match our schema
    return rawTranscript.map(item => ({
      text: decodeHTMLEntities(item.text).replace(/\n/g, ' '),
      start: item.offset / 1000,
      duration: item.duration / 1000
    }));
  } catch (error) {
    console.error('Error fetching transcript with youtube-transcript package:', error.message);
    throw new Error(`Failed to retrieve transcript: ${error.message}`);
  }
}
