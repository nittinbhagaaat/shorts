import dbConnect from '@/lib/db';
import Clip from '@/models/Clip';
import { extractServerConfig } from '@/lib/serverConfig';
import { getAuthUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const clip = await Clip.findById(id);
    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    return NextResponse.json({ clip });
  } catch (err) {
    console.error('API CLIP GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);
    const session = await getAuthUser(req);
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const existingClip = await Clip.findById(id);
    if (!existingClip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    if (existingClip.userId && (!session || session.id !== existingClip.userId.toString())) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const body = await req.json();
    const clip = await Clip.findByIdAndUpdate(id, { $set: body }, { new: true });
    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, clip });
  } catch (err) {
    console.error('API CLIP PATCH error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
