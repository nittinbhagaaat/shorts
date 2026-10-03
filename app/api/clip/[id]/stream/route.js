import dbConnect from '@/lib/db';
import Clip from '@/models/Clip';
import { extractServerConfig } from '@/lib/serverConfig';
import { getAuthUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(req, { params }) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const session = await getAuthUser(req);
    if (!session?.id) {
      return new Response('Authentication required', { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'vertical';

    const clip = await Clip.findById(id);
    if (!clip) {
      return new Response('Clip not found', { status: 404 });
    }

    if (clip.userId && session.id !== clip.userId.toString()) {
      return new Response('Access denied', { status: 403 });
    }

    let relPath = format === 'horizontal' 
      ? (clip.videoPathHorizontal || clip.videoPath)
      : (clip.videoPathVertical || clip.videoPath);

    // If not rendered yet, check if quick preview exists
    if (!relPath) {
      const previewCandidate = path.join(process.cwd(), 'public', 'outputs', `${id}-preview.mp4`);
      if (fs.existsSync(previewCandidate)) {
        relPath = `/outputs/${id}-preview.mp4`;
      }
    }

    if (!relPath) {
      return new Response('Video not rendered yet', { status: 404 });
    }

    // Resolve file on disk
    let filePath = path.join(process.cwd(), 'public', relPath);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(/*turbopackIgnore: true*/ process.cwd(), relPath);
    }
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'public', 'outputs', path.basename(relPath));
    }

    if (!fs.existsSync(filePath)) {
      console.warn(`STREAM API: File not found on disk: ${filePath}`);
      return new Response('Video file not found on disk', { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new Response('Requested range not satisfiable', {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` }
        });
      }

      const chunkSize = (end - start) + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        }
      });

      return new Response(stream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=3600',
        }
      });
    } else {
      const fileStream = fs.createReadStream(filePath);
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        }
      });

      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=3600',
        }
      });
    }
  } catch (error) {
    console.error('STREAM API: Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
