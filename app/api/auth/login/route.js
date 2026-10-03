// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { createAuthToken, getAuthCookieOptions } from '@/lib/auth';
import { extractServerConfig } from '@/lib/serverConfig';

export async function POST(req) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Find user
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // If user signed up via Google and has no password
    if (!user.password) {
      return NextResponse.json(
        { error: 'This account was created with Google Sign-In. Please sign in with Google.' },
        { status: 400 }
      );
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const userPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image || '',
      provider: user.provider || 'credentials',
    };

    // Create JWT
    const token = await createAuthToken(userPayload);

    // Set cookie
    const cookieOptions = getAuthCookieOptions();
    const response = NextResponse.json({
      message: 'Login successful',
      user: userPayload,
    });

    response.cookies.set({
      ...cookieOptions,
      value: token,
    });

    return response;
  } catch (error) {
    console.error('API AUTH LOGIN: Error during login:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}
