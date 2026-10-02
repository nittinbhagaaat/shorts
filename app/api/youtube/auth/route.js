// app/api/youtube/auth/route.js
import { generateAuthUrl } from '@/lib/youtubeClient';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const defaultRedirect = `${protocol}://${host}/api/youtube/callback`;
    const redirectUri = searchParams.get('redirectUri') || defaultRedirect;

    const clientId = process.env.GOOGLE_CLIENT_ID || searchParams.get('clientId');
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || searchParams.get('clientSecret');

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google Client ID and Client Secret are missing. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your server .env.local file.' },
        { status: 400 }
      );
    }

    const authUrl = generateAuthUrl(redirectUri, { clientId, clientSecret });

    // If client requested JSON
    if (searchParams.get('format') === 'json') {
      return NextResponse.json({ url: authUrl });
    }

    // Direct redirect to Google login
    return NextResponse.redirect(authUrl);
  } catch (err) {
    console.error('API YOUTUBE AUTH: Error generating auth URL:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
