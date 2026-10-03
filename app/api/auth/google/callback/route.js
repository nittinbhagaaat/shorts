// app/api/auth/google/callback/route.js
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { createAuthToken, getAuthCookieOptions } from '@/lib/auth';
import { extractServerConfig } from '@/lib/serverConfig';

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
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateRaw = searchParams.get('state');

  const baseUrl = getAppBaseUrl(req);

  let returnTo = '/workspaces';
  if (stateRaw) {
    try {
      const decoded = JSON.parse(Buffer.from(stateRaw, 'base64').toString('utf8'));
      if (decoded.returnTo && decoded.returnTo.startsWith('/')) {
        returnTo = decoded.returnTo;
      }
    } catch (_) {}
  }

  if (error) {
    console.error('API AUTH GOOGLE CALLBACK: Google OAuth returned error:', error);
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('Google sign-in was cancelled or failed.')}`);
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('Authorization code missing.')}`);
  }

  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Retrieve user profile from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2.userinfo.get();

    if (!profile.email) {
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent('Unable to retrieve email from Google.')}`);
    }

    const cleanEmail = profile.email.toLowerCase().trim();

    // Find user by email or googleId
    let user = await User.findOne({
      $or: [{ email: cleanEmail }, { googleId: profile.id }],
    });

    if (user) {
      // Update googleId and profile image if not already set
      let needsSave = false;
      if (!user.googleId) {
        user.googleId = profile.id;
        needsSave = true;
      }
      if (!user.image && profile.picture) {
        user.image = profile.picture;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        name: profile.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        image: profile.picture || '',
        provider: 'google',
        googleId: profile.id,
      });
    }

    const userPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image || '',
      provider: user.provider || 'google',
    };

    // Generate JWT
    const token = await createAuthToken(userPayload);

    // Set cookie and redirect to target page
    const redirectResponse = NextResponse.redirect(`${baseUrl}${returnTo}`);
    const cookieOptions = getAuthCookieOptions();

    redirectResponse.cookies.set({
      ...cookieOptions,
      value: token,
    });

    return redirectResponse;
  } catch (err) {
    console.error('API AUTH GOOGLE CALLBACK: Error processing Google sign-in:', err);
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(err.message || 'Google sign-in failed.')}`);
  }
}
