// app/api/youtube/uploads/route.js
import dbConnect from '@/lib/db';
import YouTubeUpload from '@/models/YouTubeUpload';
import { extractServerConfig } from '@/lib/serverConfig';
import { getAuthUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const session = await getAuthUser(req);
    if (!session?.id) {
      return NextResponse.json({
        uploads: [],
        scheduled: [],
        published: [],
        totalCount: 0,
        scheduledCount: 0,
        publishedCount: 0,
      });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const clipId = searchParams.get('clipId');
    const status = searchParams.get('status'); // 'scheduled' | 'uploaded'

    const filter = { userId: session.id };
    if (projectId) filter.projectId = projectId;
    if (clipId) filter.clipId = clipId;
    if (status) filter.status = status;

    const uploads = await YouTubeUpload.find(filter).sort({ uploadedAt: -1 });

    const scheduled = uploads.filter((u) => u.isScheduled || u.status === 'scheduled');
    const published = uploads.filter((u) => !u.isScheduled && u.status === 'uploaded');

    return NextResponse.json({
      uploads,
      scheduled,
      published,
      totalCount: uploads.length,
      scheduledCount: scheduled.length,
      publishedCount: published.length,
    });
  } catch (err) {
    console.error('API YOUTUBE UPLOADS: Error fetching uploads:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
