import dbConnect from '@/lib/db';
import Clip from '@/models/Clip';
import { extractServerConfig } from '@/lib/serverConfig';
import { deleteClipVideoFiles } from '@/lib/storageCleanup';
import { getAuthUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req, { params }) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const session = await getAuthUser(req);
    if (!session?.id) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'vertical';

    const clip = await Clip.findById(id);
    if (!clip || clip.status !== 'completed') {
      return NextResponse.json({ 
        error: 'Video clip is not rendered or has been deleted to save server storage. Please click Rerender Video.' 
      }, { status: 404 });
    }

    if (clip.userId && session.id !== clip.userId.toString()) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    let relativePath = clip.videoPath;
    if (format === 'horizontal') {
      relativePath = clip.videoPathHorizontal || clip.videoPath;
    } else {
      relativePath = clip.videoPathVertical || clip.videoPath;
    }

    if (!relativePath) {
      return NextResponse.json({ error: `Video format: ${format} was not rendered for this clip` }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), 'public', relativePath);
    if (!fs.existsSync(filePath)) {
      await deleteClipVideoFiles(id, clip, 'expired_10min');
      return NextResponse.json({ 
        error: 'Video file was automatically deleted after 10 minutes to save server storage. Please click Rerender Video to regenerate.' 
      }, { status: 410 });
    }

    // Create a read stream from the file
    const fileStream = fs.createReadStream(filePath);
    
    // Create a safe download filename
    const safeTitle = (clip.title || 'short-clip')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const filename = `${safeTitle}-${format}.mp4`;

    // Wrap Node.js ReadStream into Web standard ReadableStream
    const stream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    });
  } catch (error) {
    console.error('API DOWNLOAD: Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
