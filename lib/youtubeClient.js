// lib/youtubeClient.js
import { google } from 'googleapis';
import fs from 'fs';
import dbConnect from './db.js';
import YouTubeAccount from '../models/YouTubeAccount.js';

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
];

/**
 * Returns OAuth2 Client using environment variables or stored settings
 */
export function getOAuth2Client(redirectUri = null, customCredentials = null) {
  const clientId = customCredentials?.clientId || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = customCredentials?.clientSecret || process.env.GOOGLE_CLIENT_SECRET;
  const targetRedirectUri = redirectUri || 'http://localhost:3000/api/youtube/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth Client ID and Secret are required to connect YouTube. Please check .env.local or Settings.');
  }

  return new google.auth.OAuth2(clientId, clientSecret, targetRedirectUri);
}

/**
 * Generates the Google OAuth authorization URL for the user to grant access
 */
export function generateAuthUrl(redirectUri = null, customCredentials = null) {
  const oauth2Client = getOAuth2Client(redirectUri, customCredentials);

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent select_account', // Ensures Google shows account picker so user can pick the authorized test user
    include_granted_scopes: true,
    scope: YOUTUBE_SCOPES,
  });
}

/**
 * Exchanges authorization code for tokens, retrieves channel info, and saves to DB
 */
export async function exchangeCodeAndSaveAccount(code, redirectUri = null, customCredentials = null, mongodbUri = null, userId = null) {
  await dbConnect(mongodbUri);
  const oauth2Client = getOAuth2Client(redirectUri, customCredentials);

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Fetch channel details using the authenticated client
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const channelRes = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    mine: true,
  });

  const channel = channelRes.data.items?.[0];
  if (!channel) {
    throw new Error('No YouTube channel found for the authenticated Google account.');
  }

  const channelId = channel.id;
  const channelTitle = channel.snippet?.title || 'Connected Channel';
  const channelHandle = channel.snippet?.customUrl || '';
  const channelThumbnail = channel.snippet?.thumbnails?.default?.url || channel.snippet?.thumbnails?.high?.url || '';
  const subscriberCount = channel.statistics?.subscriberCount || '0';

  // Mark any other existing account for this user as not connected
  if (userId) {
    await YouTubeAccount.updateMany({ userId }, { isConnected: false });
  }

  // Update or insert the account by channelId (attaching to current user and refreshing tokens)
  let account;
  try {
    account = await YouTubeAccount.findOneAndUpdate(
      { channelId },
      {
        userId: userId || undefined,
        channelId,
        channelTitle,
        channelHandle,
        channelThumbnail,
        subscriberCount,
        tokens,
        clientId: customCredentials?.clientId || '',
        clientSecret: customCredentials?.clientSecret || '',
        isConnected: true,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    if (err.code === 11000) {
      // If a duplicate key error occurs, update the existing channel document directly
      account = await YouTubeAccount.findOneAndUpdate(
        { channelId },
        {
          userId: userId || undefined,
          channelTitle,
          channelHandle,
          channelThumbnail,
          subscriberCount,
          tokens,
          clientId: customCredentials?.clientId || '',
          clientSecret: customCredentials?.clientSecret || '',
          isConnected: true,
          updatedAt: new Date(),
        },
        { new: true }
      );
    } else {
      throw err;
    }
  }

  return account;
}

/**
 * Retrieves the currently active connected YouTube account from DB
 */
export async function getConnectedAccount(mongodbUri = null, userId = null) {
  if (!userId) return null;
  await dbConnect(mongodbUri);
  return await YouTubeAccount.findOne({ isConnected: true, userId });
}

/**
 * Creates an authenticated YouTube service client with auto token refresh
 */
export async function getAuthenticatedYouTubeClient(mongodbUri = null, userId = null) {
  const account = await getConnectedAccount(mongodbUri, userId);
  if (!account || !account.tokens) {
    throw new Error('No connected YouTube account found. Please connect your YouTube channel in Settings.');
  }

  const oauth2Client = getOAuth2Client(null, {
    clientId: account.clientId,
    clientSecret: account.clientSecret,
  });

  oauth2Client.setCredentials(account.tokens);

  // Handle token refreshes automatically and persist new tokens
  oauth2Client.on('tokens', async (newTokens) => {
    try {
      account.tokens = { ...account.tokens, ...newTokens };
      account.updatedAt = new Date();
      await account.save();
      console.log('YOUTUBE CLIENT: Refreshed and updated access tokens in DB.');
    } catch (err) {
      console.warn('YOUTUBE CLIENT: Failed to persist refreshed tokens:', err.message);
    }
  });

  return {
    youtube: google.youtube({ version: 'v3', auth: oauth2Client }),
    account,
  };
}

/**
 * Uploads a vertical Short directly or schedules it on the connected YouTube channel
 */
export async function uploadShortToYouTube({
  videoFilePath,
  title,
  description,
  tags = [],
  privacyStatus = 'public',
  scheduledPublishTime = null,
  mongodbUri = null,
  userId = null,
}) {
  if (!fs.existsSync(videoFilePath)) {
    throw new Error(`Rendered video file not found at path: ${videoFilePath}. Please render the short first.`);
  }

  const fileSize = fs.statSync(videoFilePath).size;
  if (fileSize === 0) {
    throw new Error('Video file is empty.');
  }

  const { youtube, account } = await getAuthenticatedYouTubeClient(mongodbUri, userId);

  // Ensure title includes #Shorts tag
  let finalTitle = title.trim();
  if (!finalTitle.toLowerCase().includes('#shorts')) {
    finalTitle = `${finalTitle} #Shorts`;
  }
  if (finalTitle.length > 100) {
    finalTitle = finalTitle.slice(0, 92) + '... #Shorts';
  }

  const isScheduled = Boolean(scheduledPublishTime);
  let targetPrivacy = privacyStatus;
  let publishAtIso = undefined;

  if (isScheduled) {
    // YouTube Data API requires scheduled videos to have privacyStatus 'private' and publishAt in ISO 8601
    targetPrivacy = 'private';
    const dateObj = new Date(scheduledPublishTime);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid scheduled publish time format.');
    }
    if (dateObj.getTime() <= Date.now()) {
      throw new Error('Scheduled publish time must be in the future.');
    }
    publishAtIso = dateObj.toISOString();
  }

  console.log(`YOUTUBE UPLOAD: Starting upload of Short "${finalTitle}" to channel "${account.channelTitle}"...`);
  console.log(`YOUTUBE UPLOAD: isScheduled=${isScheduled}, targetPrivacy=${targetPrivacy}, publishAt=${publishAtIso}`);

  // Pre-check if daily upload quota is already exhausted
  const quota = await getYouTubeQuotaStatus(userId, mongodbUri);
  if (quota.isExceeded) {
    const quotaErr = new Error("Today's upload limit has been reached! You can do it again tomorrow.");
    quotaErr.code = 429;
    quotaErr.status = 429;
    quotaErr.quotaExceeded = true;
    quotaErr.resetAt = quota.resetAt;
    throw quotaErr;
  }

  let res;
  try {
    res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: finalTitle,
          description: description || '',
          tags: Array.isArray(tags) ? tags : [],
          categoryId: '23', // Comedy / Entertainment
        },
        status: {
          privacyStatus: targetPrivacy,
          publishAt: publishAtIso,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoFilePath),
      },
    });
  } catch (insertErr) {
    if (isYouTubeQuotaExceededError(insertErr)) {
      const resetAt = await markYouTubeQuotaExceeded(userId, mongodbUri);
      const friendlyQuotaErr = new Error("Today's upload limit has been reached! You can do it again tomorrow.");
      friendlyQuotaErr.code = 429;
      friendlyQuotaErr.status = 429;
      friendlyQuotaErr.quotaExceeded = true;
      friendlyQuotaErr.resetAt = resetAt;
      throw friendlyQuotaErr;
    }
    throw insertErr;
  }

  const uploadedVideo = res.data;
  const videoId = uploadedVideo.id;
  const shortUrl = `https://youtube.com/shorts/${videoId}`;

  console.log(`YOUTUBE UPLOAD: Successfully uploaded Short! Video ID: ${videoId}, URL: ${shortUrl}`);

  return {
    videoId,
    shortUrl,
    title: finalTitle,
    channelTitle: account.channelTitle,
    channelId: account.channelId,
    status: isScheduled ? 'scheduled' : 'uploaded',
    isScheduled,
    scheduledPublishTime: publishAtIso ? new Date(publishAtIso) : null,
  };
}

/**
 * Calculates the next YouTube Data API quota reset time (midnight Pacific Time).
 */
export function getNextYouTubeQuotaReset() {
  try {
    const now = new Date();
    // Get time in America/Los_Angeles (Pacific Time)
    const ptString = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
    const ptDate = new Date(ptString);
    const nextMidnightPT = new Date(ptDate);
    nextMidnightPT.setHours(24, 0, 0, 0);
    const diffMs = nextMidnightPT.getTime() - ptDate.getTime();
    return new Date(now.getTime() + diffMs);
  } catch (e) {
    // Fallback: 24h from now
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }
}

/**
 * Checks if an error represents YouTube Data API daily upload quota exhaustion.
 */
export function isYouTubeQuotaExceededError(err) {
  if (!err) return false;
  const str = (
    (err.message || '') +
    ' ' +
    (err.cause?.message || '') +
    ' ' +
    (err.status || '') +
    ' ' +
    (err.cause?.status || '') +
    ' ' +
    JSON.stringify(err.errors || err.cause?.errors || '')
  ).toLowerCase();

  return (
    str.includes('quota exceeded') ||
    str.includes('video uploads per day') ||
    (str.includes('video uploads') && str.includes('quota metric')) ||
    str.includes('resource_exhausted') ||
    str.includes('uploadlimitexceeded') ||
    str.includes('quotaexceeded') ||
    str.includes('daily upload limit') ||
    (err.code === 429 && (str.includes('upload') || str.includes('video') || str.includes('quota'))) ||
    (err.status === 429 && (str.includes('upload') || str.includes('video') || str.includes('quota')))
  );
}

/**
 * Persists the quota exceeded state in MongoDB for connected YouTube accounts.
 */
export async function markYouTubeQuotaExceeded(userId = null, customUri = null) {
  const resetAt = getNextYouTubeQuotaReset();
  const now = new Date();
  try {
    await dbConnect(customUri);
    const filter = userId ? { userId } : {};
    await YouTubeAccount.updateMany(
      filter,
      {
        $set: {
          uploadQuotaExceeded: true,
          uploadQuotaExceededAt: now,
          uploadQuotaResetAt: resetAt,
          updatedAt: now,
        },
      }
    );
    console.log(`YOUTUBE QUOTA: Marked daily upload limit exceeded until ${resetAt.toISOString()}`);
  } catch (e) {
    console.error('YOUTUBE QUOTA: Failed to persist quota exceeded state:', e.message);
  }
  return resetAt;
}

/**
 * Retrieves the current quota status, auto-resetting if the reset time has passed.
 */
export async function getYouTubeQuotaStatus(userId = null, customUri = null) {
  try {
    await dbConnect(customUri);
    const filter = userId ? { userId, isConnected: true } : { isConnected: true };
    const account = await YouTubeAccount.findOne(filter);

    if (account?.uploadQuotaExceeded) {
      const now = new Date();
      if (account.uploadQuotaResetAt && now >= new Date(account.uploadQuotaResetAt)) {
        // Reset expired quota
        await YouTubeAccount.updateMany(
          userId ? { userId } : {},
          {
            $set: {
              uploadQuotaExceeded: false,
              uploadQuotaResetAt: null,
              uploadQuotaExceededAt: null,
              updatedAt: now,
            },
          }
        );
        return { isExceeded: false, resetAt: null };
      }
      return {
        isExceeded: true,
        resetAt: account.uploadQuotaResetAt,
        exceededAt: account.uploadQuotaExceededAt,
      };
    }
  } catch (e) {
    console.error('YOUTUBE QUOTA: Error checking status:', e.message);
  }
  return { isExceeded: false, resetAt: null };
}

/**
 * Manually resets the quota status.
 */
export async function resetYouTubeQuota(userId = null, customUri = null) {
  try {
    await dbConnect(customUri);
    const filter = userId ? { userId } : {};
    await YouTubeAccount.updateMany(
      filter,
      {
        $set: {
          uploadQuotaExceeded: false,
          uploadQuotaResetAt: null,
          uploadQuotaExceededAt: null,
          updatedAt: new Date(),
        },
      }
    );
    return true;
  } catch (e) {
    console.error('YOUTUBE QUOTA: Failed to reset quota:', e.message);
    return false;
  }
}
