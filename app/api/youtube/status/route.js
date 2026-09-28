// app/api/youtube/status/route.js
import dbConnect from '@/lib/db';
import YouTubeAccount from '@/models/YouTubeAccount';
import { extractServerConfig } from '@/lib/serverConfig';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const account = await YouTubeAccount.findOne({ isConnected: true });

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

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'disconnect';

    if (action === 'disconnect') {
      await YouTubeAccount.updateMany({}, { isConnected: false });
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

    await YouTubeAccount.updateMany({}, { isConnected: false });
    return NextResponse.json({ success: true, message: 'YouTube channel disconnected.' });
  } catch (err) {
    console.error('API YOUTUBE STATUS: Error disconnecting channel:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
