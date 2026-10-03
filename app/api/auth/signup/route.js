// app/api/auth/signup/route.js
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
    const { name, email, password } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      if (existingUser.provider === 'google' && !existingUser.password) {
        return NextResponse.json(
          { error: 'An account with this email already exists via Google Sign-In. Please sign in with Google.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      provider: 'credentials',
      image: '',
    });

    const userPayload = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      image: newUser.image || '',
      provider: newUser.provider,
    };

    // Create JWT
    const token = await createAuthToken(userPayload);

    // Set cookie in response
    const cookieOptions = getAuthCookieOptions();
    const response = NextResponse.json(
      {
        message: 'Account created successfully',
        user: userPayload,
      },
      { status: 201 }
    );

    response.cookies.set({
      ...cookieOptions,
      value: token,
    });

    return response;
  } catch (error) {
    console.error('API AUTH SIGNUP: Error registering user:', error);
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
