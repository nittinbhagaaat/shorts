import dbConnect from '@/lib/db';
import Clip from '@/models/Clip';
import Project from '@/models/Project';
import { downloadVideoClip, generateAssSubtitles, renderFinalShort } from '@/lib/video';
import { extractServerConfig } from '@/lib/serverConfig';
import { getAuthUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req, { params }) {
  try {
    const { mongodbUri, ffmpegPath, ytDlpPath } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const session = await getAuthUser(req);
    if (!session?.id) {
      return NextResponse.json({ error: 'Authentication required. Please sign in.' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const body = await req.json();
    const {
      enableSubtitles,
      captionStyle,
      cropFocus,
      transcript,
      captionLanguage,
      renderFormat,
      captionYPercent,
      captionAlign,
      overlayText,
      overlayTextOpacity,
      overlayTextYPercent,
      overlayTextColor,
      overlayTextSize,
      overlayTextBg
    } = body;

    const clip = await Clip.findById(id);
    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    if (clip.userId && session.id !== clip.userId.toString()) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const project = await Project.findById(clip.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Parent project not found' }, { status: 404 });
    }

    if (project.userId && session.id !== project.userId.toString()) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    // Update status to rendering and ensure subtitles are disabled
    clip.status = 'rendering';
    clip.enableSubtitles = false;
    clip.captionStyle = 'none';
    clip.cropFocus = cropFocus || clip.cropFocus || 'auto';
    clip.renderFormat = renderFormat || clip.renderFormat || 'vertical';

    if (typeof overlayText === 'string') clip.overlayText = overlayText;
    if (typeof overlayTextOpacity === 'number') clip.overlayTextOpacity = overlayTextOpacity;
    if (typeof overlayTextYPercent === 'number') clip.overlayTextYPercent = overlayTextYPercent;
    if (overlayTextColor) clip.overlayTextColor = overlayTextColor;
    if (overlayTextSize) clip.overlayTextSize = overlayTextSize;
    if (typeof overlayTextBg === 'boolean') clip.overlayTextBg = overlayTextBg;
    
    await clip.save();

    // Ensure output directories exist in public folder
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    const outputsDir = path.join(process.cwd(), 'public', 'outputs');
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(outputsDir)) {
      fs.mkdirSync(outputsDir, { recursive: true });
    }

    // File paths
    const tempVideoFileName = `temp-${id}.mp4`;
    const tempAssFileName = `sub-${id}.ass`;
    const tempVideoPath = path.join(tempDir, tempVideoFileName);
    const tempAssPath = path.join(tempDir, tempAssFileName);

    const verticalFileName = `${id}-vertical.mp4`;
    const horizontalFileName = `${id}-horizontal.mp4`;
    const verticalPath = path.join(outputsDir, verticalFileName);
    const horizontalPath = path.join(outputsDir, horizontalFileName);

    // Speed Optimization: Reuse cached video clip if already downloaded for preview
    const cachedPreviewFileName = `${id}-preview.mp4`;
    const cachedPreviewPath = path.join(outputsDir, cachedPreviewFileName);

    if (fs.existsSync(cachedPreviewPath) && fs.statSync(cachedPreviewPath).size > 10000) {
      console.log(`RENDER API: Reusing cached video segment ${cachedPreviewFileName} for instant rendering.`);
      fs.copyFileSync(cachedPreviewPath, tempVideoPath);
    } else {
      console.log(`RENDER API: Downloading clip section for clip ${id} (${clip.start}s to ${clip.end}s)...`);
      await downloadVideoClip(project.url, clip.start, clip.end, tempVideoPath, ytDlpPath, ffmpegPath);
      try {
        fs.copyFileSync(tempVideoPath, cachedPreviewPath);
      } catch (cacheErr) {
        // ignore
      }
    }

    // Text Overlay options (if user added custom text overlay)
    const hasOverlay = Boolean(clip.overlayText && clip.overlayText.trim());
    const relativeAssPath = hasOverlay ? `public/temp/${tempAssFileName}` : null;

    if (hasOverlay) {
      const assOptions = {
        enableSubtitles: false,
        overlayText: clip.overlayText,
        overlayTextOpacity: clip.overlayTextOpacity,
        overlayTextYPercent: clip.overlayTextYPercent,
        overlayTextColor: clip.overlayTextColor,
        overlayTextSize: clip.overlayTextSize,
        overlayTextBg: clip.overlayTextBg
      };

      const assContent = generateAssSubtitles([], clip.start, clip.end, 'none', false, assOptions);
      fs.writeFileSync(tempAssPath, assContent, 'utf8');
    }

    // Step 2: Render Vertical Layout if selected (fast camera framing, no subtitles)
    if (clip.renderFormat === 'vertical' || clip.renderFormat === 'both') {
      console.log(`RENDER API: High-speed rendering vertical layout with cropFocus=${clip.cropFocus}...`);
      await renderFinalShort(tempVideoPath, relativeAssPath, clip.cropFocus, 'none', verticalPath, false, ffmpegPath);
      clip.videoPathVertical = `/outputs/${verticalFileName}`;
    }

    // Step 3: Render Horizontal Layout if selected
    if (clip.renderFormat === 'horizontal' || clip.renderFormat === 'both') {
      console.log(`RENDER API: High-speed rendering horizontal layout...`);
      await renderFinalShort(tempVideoPath, relativeAssPath, clip.cropFocus, 'none', horizontalPath, true, ffmpegPath);
      clip.videoPathHorizontal = `/outputs/${horizontalFileName}`;
    }

    // Legacy fallback mapping
    clip.videoPath = clip.renderFormat === 'horizontal' ? clip.videoPathHorizontal : clip.videoPathVertical;

    // Step 4: Clean up temp files
    try {
      if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
      if (fs.existsSync(tempAssPath)) fs.unlinkSync(tempAssPath);
      console.log(`RENDER API: Temporary files cleaned up.`);
    } catch (cleanupError) {
      console.warn(`RENDER API: Failed to clean up some temporary files:`, cleanupError.message);
    }

    // Step 5: Update clip in database to completed
    clip.status = 'completed';
    await clip.save();

    console.log(`RENDER API: Clip ${id} successfully rendered and completed!`);
    return NextResponse.json({ clip });
  } catch (error) {
    console.error('RENDER API: Error rendering clip:', error);

    // Revert status to failed in database
    try {
      const { mongodbUri } = extractServerConfig(req);
      await dbConnect(mongodbUri);
      const resolvedParams = await params;
      const { id } = resolvedParams;
      await Clip.findByIdAndUpdate(id, { status: 'failed' });
    } catch (dbError) {
      console.error('RENDER API: Failed to update error status in DB:', dbError.message);
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const clip = await Clip.findById(id);
    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    // List of possible rendered output files
    const filePaths = [
      clip.videoPath,
      clip.videoPathVertical,
      clip.videoPathHorizontal,
      `/outputs/${id}-vertical.mp4`,
      `/outputs/${id}-horizontal.mp4`,
      `/outputs/${id}.mp4`
    ].filter(Boolean);

    // Unlink each file from public outputs directory if it exists
    filePaths.forEach(relativeFilePath => {
      const absoluteFilePath = path.join(process.cwd(), 'public', relativeFilePath);
      try {
        if (fs.existsSync(absoluteFilePath)) {
          fs.unlinkSync(absoluteFilePath);
          console.log(`RENDER API: Deleted output file: ${absoluteFilePath}`);
        }
      } catch (err) {
        console.warn(`RENDER API: Failed to delete file: ${absoluteFilePath}`, err.message);
      }
    });

    // Reset clip fields in database
    clip.status = 'pending';
    clip.videoPath = undefined;
    clip.videoPathVertical = undefined;
    clip.videoPathHorizontal = undefined;
    
    await clip.save();

    console.log(`RENDER API: Clip ${id} rendering has been reset and files deleted.`);
    return NextResponse.json({ success: true, clip });
  } catch (error) {
    console.error('RENDER API: Error resetting clip render:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
