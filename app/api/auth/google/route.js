// app/api/auth/google/route.js
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

function getAppBaseUrl(req) {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const baseUrl = getAppBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google OAuth Client ID or Secret is not configured in .env.local.' },
        { status: 500 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    // Optional return URL passed via state param
    const returnTo = searchParams.get('returnTo') || '/workspaces';
    const state = Buffer.from(JSON.stringify({ returnTo })).toString('base64');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'online',
      scope: scopes,
      prompt: 'select_account',
      state,
    });

    if (searchParams.get('format') === 'json') {
      return NextResponse.json({ url: authUrl, redirectUri });
    }

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('API AUTH GOOGLE: Error generating Google auth URL:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
