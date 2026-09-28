import dbConnect from '@/lib/db';
import Clip from '@/models/Clip';
import Project from '@/models/Project';
import { downloadVideoClip } from '@/lib/video';
import { extractServerConfig } from '@/lib/serverConfig';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req, { params }) {
  try {
    const { mongodbUri, ffmpegPath, ytDlpPath } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const clip = await Clip.findById(id);
    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    const outputsDir = path.join(process.cwd(), 'public', 'outputs');
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
    }

    // 1. If rendered output already exists, return that
    if (clip.videoPathVertical && fs.existsSync(path.join(process.cwd(), 'public', clip.videoPathVertical))) {
      return NextResponse.json({ success: true, previewUrl: clip.videoPathVertical, isRendered: true });
    }
    if (clip.videoPath && fs.existsSync(path.join(process.cwd(), 'public', clip.videoPath))) {
      return NextResponse.json({ success: true, previewUrl: clip.videoPath, isRendered: true });
    }

    // 2. Check if cached raw clip preview exists
    const previewFileName = `${id}-preview.mp4`;
    const previewFilePath = path.join(outputsDir, previewFileName);
    const relativePreviewUrl = `/outputs/${previewFileName}`;

    if (fs.existsSync(previewFilePath) && fs.statSync(previewFilePath).size > 10000) {
      return NextResponse.json({ success: true, previewUrl: relativePreviewUrl, isRendered: false });
    }

    // 3. Otherwise, quickly extract 30s video segment using yt-dlp
    const project = await Project.findById(clip.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Parent project not found' }, { status: 404 });
    }

    console.log(`PREVIEW API: Downloading quick raw preview for clip ${id} (${clip.start}s - ${clip.end}s)...`);
    await downloadVideoClip(project.url, clip.start, clip.end, previewFilePath, ytDlpPath, ffmpegPath);

    return NextResponse.json({
      success: true,
      previewUrl: relativePreviewUrl,
      isRendered: false
    });
  } catch (err) {
    console.error('PREVIEW API: Error generating preview:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate preview' }, { status: 500 });
  }
}
