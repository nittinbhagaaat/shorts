// app/api/youtube/status/route.js
import dbConnect from '@/lib/db';
import YouTubeAccount from '@/models/YouTubeAccount';
import { extractServerConfig } from '@/lib/serverConfig';
import { getAuthUser } from '@/lib/auth';
import {
  getYouTubeQuotaStatus,
  resetYouTubeQuota,
  markYouTubeQuotaExceeded,
} from '@/lib/youtubeClient';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const session = await getAuthUser(req);
    if (!session?.id) {
      return NextResponse.json({
        connected: false,
        account: null,
      });
    }

    const account = await YouTubeAccount.findOne({ isConnected: true, userId: session.id });

    const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
    const googleProjectId = googleClientId.includes('-') ? googleClientId.split('-')[0] : null;

    if (!account) {
      return NextResponse.json({
        connected: false,
        account: null,
        isConfigured: Boolean(googleClientId && process.env.GOOGLE_CLIENT_SECRET),
        googleProjectId,
      });
    }

    const quotaStatus = await getYouTubeQuotaStatus(session.id, mongodbUri);
    const uploadQuotaExceeded = quotaStatus.isExceeded;
    const uploadQuotaResetAt = quotaStatus.resetAt;
    const uploadQuotaMessage = uploadQuotaExceeded
      ? "Today's upload limit has been reached! You can do it again tomorrow."
      : null;

    return NextResponse.json(
      {
        connected: true,
        isConfigured: Boolean(googleClientId && process.env.GOOGLE_CLIENT_SECRET),
        googleProjectId,
        uploadQuotaExceeded,
        uploadQuotaResetAt,
        uploadQuotaMessage,
        account: {
          channelId: account.channelId,
          channelTitle: account.channelTitle,
          channelHandle: account.channelHandle,
          channelThumbnail: account.channelThumbnail,
          subscriberCount: account.subscriberCount,
          connectedAt: account.connectedAt,
          uploadQuotaExceeded,
          uploadQuotaResetAt,
          uploadQuotaMessage,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (err) {
    console.error('API YOUTUBE STATUS: Error fetching status:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const session = await getAuthUser(req);
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'disconnect';

    if (action === 'disconnect') {
      await YouTubeAccount.updateMany({ userId: session.id }, { isConnected: false });
      return NextResponse.json({ success: true, message: 'YouTube channel disconnected.' });
    }

    if (action === 'reset-quota') {
      await resetYouTubeQuota(session.id, mongodbUri);
      return NextResponse.json({ success: true, message: 'Upload limit status reset successfully.' });
    }

    if (action === 'mark-quota-exceeded') {
      const resetAt = await markYouTubeQuotaExceeded(session.id, mongodbUri);
      return NextResponse.json({ success: true, message: "Marked upload limit as reached.", resetAt });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('API YOUTUBE STATUS: Error updating status:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const session = await getAuthUser(req);
    if (!session?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await YouTubeAccount.deleteMany({ userId: session.id });
    return NextResponse.json({ success: true, message: 'YouTube connection removed completely.' });
  } catch (err) {
    console.error('API YOUTUBE STATUS: Error deleting account:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
