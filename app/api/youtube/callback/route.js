// app/api/youtube/callback/route.js
import { exchangeCodeAndSaveAccount } from '@/lib/youtubeClient';
import { extractServerConfig } from '@/lib/serverConfig';
import { getAuthUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/youtube/callback`;

    if (error) {
      console.warn('API YOUTUBE CALLBACK: Google OAuth error returned:', error);
      return NextResponse.redirect(`${protocol}://${host}/settings?youtube_error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return NextResponse.redirect(`${protocol}://${host}/settings?youtube_error=No+authorization+code+provided`);
    }

    const { mongodbUri } = extractServerConfig(req);
    const session = await getAuthUser(req);
    const account = await exchangeCodeAndSaveAccount(code, redirectUri, null, mongodbUri, session?.id);

    console.log(`API YOUTUBE CALLBACK: Successfully connected YouTube channel: ${account.channelTitle} (${account.channelId})`);
    return NextResponse.redirect(`${protocol}://${host}/settings?youtube=connected&channel=${encodeURIComponent(account.channelTitle)}`);
  } catch (err) {
    console.error('API YOUTUBE CALLBACK: Exception exchanging code:', err);
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return NextResponse.redirect(`${protocol}://${host}/settings?youtube_error=${encodeURIComponent(err.message)}`);
  }
}
