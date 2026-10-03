// lib/auth.js
import { SignJWT, jwtVerify } from 'jose';
import dbConnect from './db';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'shorts_studio_secure_jwt_token_secret_key_2026_xyz';
const secretKey = new TextEncoder().encode(JWT_SECRET);

export const AUTH_COOKIE_NAME = 'shorts_auth_token';

/**
 * Signs a secure JWT token for a user
 */
export async function createAuthToken(user) {
  const payload = {
    id: user._id ? user._id.toString() : user.id,
    email: user.email,
    name: user.name,
    image: user.image || '',
    provider: user.provider || 'credentials',
  };

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey);
}

/**
 * Verifies a JWT token and returns payload if valid
 */
export async function verifyAuthToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Extracts and verifies the authenticated user from a Next.js App Router Request
 * Checks both the HTTP-only cookie and the Authorization: Bearer header
 */
export async function getAuthUser(req) {
  try {
    let token = null;

    // Check cookies
    if (req?.cookies && typeof req.cookies.get === 'function') {
      token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    }

    // Fallback: Check Cookie header directly if req.cookies is not parsed
    if (!token && req?.headers) {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]*)`));
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    // Fallback: Check Authorization header
    if (!token && req?.headers) {
      const authHeader = req.headers.get('authorization') || '';
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) return null;

    const payload = await verifyAuthToken(token);
    if (!payload || !payload.id) return null;

    return payload;
  } catch (error) {
    console.error('getAuthUser error:', error.message);
    return null;
  }
}

/**
 * Cookie options for setting the auth session token
 */
export function getAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    name: AUTH_COOKIE_NAME,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  };
}
