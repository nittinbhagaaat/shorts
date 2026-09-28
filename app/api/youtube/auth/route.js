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

    const clientId = searchParams.get('clientId') || req.headers.get('x-google-client-id') || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = searchParams.get('clientSecret') || req.headers.get('x-google-client-secret') || process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google Client ID and Client Secret are missing. Please provide them in Settings or .env.local.' },
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
