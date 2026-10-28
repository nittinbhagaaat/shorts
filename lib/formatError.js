/**
 * Sanitizes raw technical server errors (yt-dlp traces, ffmpeg errors, stack traces,
 * API JSON dumps) into clean, human-friendly, actionable messages.
 */
export function formatFriendlyError(error) {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const rawMsg = typeof error === 'string' ? error : error.message || error.toString() || '';
  const msg = rawMsg.toLowerCase();

  // 1. YouTube Bot Detection / Captcha / Age Restriction / Cookies
  if (
    msg.includes("sign in to confirm you're not a bot") ||
    msg.includes("confirm you're not a bot") ||
    msg.includes('bot verification') ||
    msg.includes('sign in to confirm your age') ||
    msg.includes('age-restricted') ||
    msg.includes('login required') ||
    (msg.includes('http error 429') && msg.includes('youtube')) ||
    (msg.includes('too many requests') && msg.includes('youtube'))
  ) {
    return 'YouTube requires verification for this video. Please update your cookies.txt or try a different video.';
  }

  // 2. YouTube Video Unavailable / Private / Removed / DRM
  if (
    msg.includes('video unavailable') ||
    msg.includes('private video') ||
    msg.includes('this video is private') ||
    msg.includes('this video has been removed') ||
    msg.includes('members-only') ||
    msg.includes('join this channel') ||
    msg.includes('premieres in') ||
    msg.includes('drm')
  ) {
    return 'This YouTube video is private, restricted, or unavailable. Please check the URL or try a public video.';
  }

  // 3. YouTube Transcripts / Subtitles missing
  if (
    msg.includes('could not retrieve a transcript') ||
    msg.includes('subtitles are disabled') ||
    msg.includes('no transcript found') ||
    msg.includes('transcript is empty') ||
    (msg.includes('transcript') && msg.includes('failed'))
  ) {
    return 'Could not find spoken captions for this video. Please select a video with clear spoken dialogue.';
  }

  // 4. Invalid YouTube URL
  if (
    msg.includes('invalid youtube url') ||
    msg.includes('incomplete youtube id') ||
    msg.includes('could not extract video id') ||
    msg.includes('unsupported url') ||
    msg.includes('youtube url is required')
  ) {
    return 'Please enter a valid YouTube video link (e.g. https://www.youtube.com/watch?v=...).';
  }

  // 5. YouTube API Upload / Quota / OAuth errors
  if (
    msg.includes('uploadlimitexceeded') ||
    msg.includes('the user has exceeded the number of videos') ||
    msg.includes('quotaexceeded') ||
    msg.includes('youtube upload quota')
  ) {
    return 'YouTube daily upload limit reached for today. Please wait or upload directly to YouTube Studio.';
  }

  if (
    msg.includes('invalid_grant') ||
    msg.includes('token expired') ||
    (msg.includes('unauthorized') && msg.includes('youtube')) ||
    (msg.includes('not connected') && msg.includes('youtube'))
  ) {
    return 'Your YouTube channel connection expired. Please reconnect your YouTube channel under Settings.';
  }

  // 6. AI Rate Limits & Quotas
  if (
    msg.includes('ratelimit') ||
    msg.includes('rate_limit') ||
    msg.includes('resource has been exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('429')
  ) {
    return 'AI request limit reached. Please wait a moment and try again, or switch your AI provider in Settings.';
  }

  // 7. AI API Key Issues
  if (
    msg.includes('invalid api key') ||
    msg.includes('incorrect api key') ||
    msg.includes('api key not found') ||
    (msg.includes('authentication failed') && msg.includes('ai'))
  ) {
    return 'Invalid or missing AI API key. Please check your API key in Settings.';
  }

  // 8. Video format or stream unavailable / FFmpeg errors
  if (
    msg.includes('requested format is not available') ||
    msg.includes('conversion failed') ||
    msg.includes('protocol not found') ||
    msg.includes('error in the pull function') ||
    (msg.includes('ffmpeg') && msg.includes('failed'))
  ) {
    return 'Unable to process this video stream. Please check your video link and retry.';
  }

  // 9. Database / Network Connection
  if (
    msg.includes('mongoservererror') ||
    msg.includes('econnrefused') ||
    msg.includes('buffering timed out') ||
    msg.includes('failed to connect to mongodb')
  ) {
    return 'Database connection error. Please ensure MongoDB is running and try again.';
  }

  // 10. Storage / Disk Full
  if (
    msg.includes('enospc') ||
    msg.includes('no space left on device')
  ) {
    return 'Server storage is full. Please run the cleanup script or wait for scheduled maintenance.';
  }

  // 11. Clean command-line outputs, stack traces, or excessively long messages
  if (
    rawMsg.includes('Command failed:') ||
    rawMsg.includes('Traceback') ||
    rawMsg.includes('    at ') ||
    rawMsg.includes('npm ERR!') ||
    rawMsg.length > 90
  ) {
    // If it's a yt-dlp error line:
    if (rawMsg.includes('ERROR:')) {
      const errorLine = rawMsg.split('\n').find((l) => l.includes('ERROR:'));
      if (errorLine) {
        const cleanLine = errorLine.replace(/^ERROR:\s*(\[[^\]]+\]\s*)?/, '').trim();
        if (cleanLine.length > 5 && cleanLine.length < 80) {
          return cleanLine;
        }
      }
    }
    return 'Failed to process request. Please check your video URL or settings and try again.';
  }

  return rawMsg;
}

export default formatFriendlyError;
