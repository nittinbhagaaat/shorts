// lib/stream-resolver.js

/**
 * Resolves a direct playable stream URL for a YouTube video using resilient public mirror APIs.
 * This completely circumvents datacenter IP bot gates (PO-token) on platforms like Render / AWS / Vercel.
 */
export async function resolveDirectStreamUrl(youtubeUrl, videoId) {
  const targetId = videoId || extractIdFromUrl(youtubeUrl);
  if (!targetId) {
    throw new Error('Invalid YouTube URL or video ID.');
  }

  const cleanUrl = `https://www.youtube.com/watch?v=${targetId}`;

  // Provider 1: Cobalt API Mirrors (v7 / v8 / v9 / v10 compatible)
  const cobaltInstances = [
    'https://api.cobalt.tools',
    'https://cobalt-api.kwiatekm.tokyo',
    'https://co.wuk.sh',
    'https://api.wuk.sh',
    'https://cobalt.canine.tools',
    'https://cobalt.api.timelessoses.vip'
  ];

  for (const instance of cobaltInstances) {
    try {
      console.log(`[Stream Resolver] Trying Cobalt mirror: ${instance}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(instance, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          url: cleanUrl,
          videoQuality: '720'
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const streamUrl = data.url || data.stream || (data.picker && data.picker[0] && data.picker[0].url);
        if (streamUrl && streamUrl.startsWith('http')) {
          console.log(`[Stream Resolver] Successfully resolved stream URL via Cobalt (${instance})`);
          return streamUrl;
        }
      }
    } catch (err) {
      console.warn(`[Stream Resolver] Cobalt mirror ${instance} failed:`, err.message);
    }
  }

  // Provider 2: Invidious API Mirrors
  const invidiousInstances = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://yewtu.be',
    'https://invidious.protokolla.fi',
    'https://invidious.private.coffee',
    'https://invidious.asir.dev'
  ];

  for (const instance of invidiousInstances) {
    try {
      console.log(`[Stream Resolver] Trying Invidious mirror: ${instance}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${instance}/api/v1/videos/${targetId}`, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const streams = data.formatStreams || data.adaptiveFormats || [];
        
        // Find 720p or best MP4 stream
        const mp4Stream = streams.find(s => (s.container === 'mp4' || s.type?.includes('mp4') || s.qualityLabel?.includes('720')) && s.url) || streams.find(s => s.url);
        if (mp4Stream && mp4Stream.url) {
          console.log(`[Stream Resolver] Successfully resolved stream URL via Invidious (${instance})`);
          return mp4Stream.url;
        }
      }
    } catch (err) {
      console.warn(`[Stream Resolver] Invidious mirror ${instance} failed:`, err.message);
    }
  }

  // Provider 3: Piped API Mirrors
  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.privacydev.net',
    'https://pipedapi.tokhmi.xyz',
    'https://piped-api.lunar.icu'
  ];

  for (const instance of pipedInstances) {
    try {
      console.log(`[Stream Resolver] Trying Piped mirror: ${instance}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${instance}/streams/${targetId}`, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const videoStreams = data.videoStreams || [];
        const validStream = videoStreams.find(s => (s.format === 'mp4' || s.mimeType?.includes('mp4') || s.quality === '720p') && s.url) || videoStreams.find(s => s.url);
        if (validStream && validStream.url) {
          console.log(`[Stream Resolver] Successfully resolved stream URL via Piped (${instance})`);
          return validStream.url;
        }
      }
    } catch (err) {
      console.warn(`[Stream Resolver] Piped mirror ${instance} failed:`, err.message);
    }
  }

  return null;
}

function extractIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  return (match && match[2].length === 11) ? match[2] : null;
}
