import fs from 'fs';
import path from 'path';

export async function GET(req, { params }) {
  try {
    const resolvedParams = await params;
    const fileParts = resolvedParams.file;
    const filename = Array.isArray(fileParts) ? fileParts.join('/') : fileParts;

    if (!filename) {
      return new Response('File not specified', { status: 400 });
    }

    // Security check: prevent directory traversal
    if (filename.includes('..')) {
      return new Response('Forbidden', { status: 403 });
    }

    // Find file in public/outputs or outputs
    let filePath = path.join(process.cwd(), 'public', 'outputs', filename);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'public', filename);
    }
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'outputs', filename);
    }

    if (!fs.existsSync(filePath)) {
      console.warn(`OUTPUTS ROUTE: File not found on disk: ${filePath}`);
      return new Response('File not found', { status: 404 });
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
    console.error('OUTPUTS ROUTE: Streaming error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
