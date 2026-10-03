// app/api/auth/me/route.js
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { extractServerConfig } from '@/lib/serverConfig';

export async function GET(req) {
  try {
    const session = await getAuthUser(req);
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const user = await User.findById(session.id).select('-password');
    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image || '',
        provider: user.provider || 'credentials',
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('API AUTH ME: Error fetching current user:', error);
    return NextResponse.json({ user: null, error: error.message }, { status: 500 });
  }
}
