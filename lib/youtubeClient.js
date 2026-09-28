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
    prompt: 'consent', // Ensures Google returns a refresh_token
    scope: YOUTUBE_SCOPES,
  });
}

/**
 * Exchanges authorization code for tokens, retrieves channel info, and saves to DB
 */
export async function exchangeCodeAndSaveAccount(code, redirectUri = null, customCredentials = null, mongodbUri = null) {
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

  // Mark any other existing account as not connected so there is one active channel
  await YouTubeAccount.updateMany({}, { isConnected: false });

  // Update or insert the new connected account
  const account = await YouTubeAccount.findOneAndUpdate(
    { channelId },
    {
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
    { upsert: true, new: true }
  );

  return account;
}

/**
 * Retrieves the currently active connected YouTube account from DB
 */
export async function getConnectedAccount(mongodbUri = null) {
  await dbConnect(mongodbUri);
  return await YouTubeAccount.findOne({ isConnected: true });
}

/**
 * Creates an authenticated YouTube service client with auto token refresh
 */
export async function getAuthenticatedYouTubeClient(mongodbUri = null) {
  const account = await getConnectedAccount(mongodbUri);
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
}) {
  if (!fs.existsSync(videoFilePath)) {
    throw new Error(`Rendered video file not found at path: ${videoFilePath}. Please render the short first.`);
  }

  const fileSize = fs.statSync(videoFilePath).size;
  if (fileSize === 0) {
    throw new Error('Video file is empty.');
  }

  const { youtube, account } = await getAuthenticatedYouTubeClient(mongodbUri);

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

  const res = await youtube.videos.insert({
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
