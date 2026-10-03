// app/api/youtube/status/route.js
import dbConnect from '@/lib/db';
import YouTubeAccount from '@/models/YouTubeAccount';
import { extractServerConfig } from '@/lib/serverConfig';
import { getAuthUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const session = await getAuthUser(req);
    const query = { isConnected: true };
    if (session?.id) {
      query.userId = session.id;
    }

    const account = await YouTubeAccount.findOne(query);

    if (!account) {
      return NextResponse.json({
        connected: false,
        account: null,
      });
    }

    return NextResponse.json({
      connected: true,
      account: {
        channelId: account.channelId,
        channelTitle: account.channelTitle,
        channelHandle: account.channelHandle,
        channelThumbnail: account.channelThumbnail,
        subscriberCount: account.subscriberCount,
        connectedAt: account.connectedAt,
      },
    });
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
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'disconnect';

    if (action === 'disconnect') {
      const updateQuery = session?.id ? { userId: session.id } : {};
      await YouTubeAccount.updateMany(updateQuery, { isConnected: false });
      return NextResponse.json({ success: true, message: 'YouTube channel disconnected.' });
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
    const deleteQuery = session?.id ? { userId: session.id } : {};
    await YouTubeAccount.deleteMany(deleteQuery);
    return NextResponse.json({ success: true, message: 'YouTube connection removed completely.' });
  } catch (err) {
    console.error('API YOUTUBE STATUS: Error deleting account:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
