import dbConnect from '@/lib/db';
import Clip from '@/models/Clip';
import Project from '@/models/Project';
import { downloadVideoClip, generateAssSubtitles, renderFinalShort } from '@/lib/video';
import { extractSettings } from '@/lib/settings';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req, { params }) {
  try {
    const body = await req.json();
    const settings = extractSettings(req, body);
    await dbConnect(settings.mongodb_uri);

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const { captionStyle, cropFocus, transcript, captionLanguage, renderFormat } = body;

    const clip = await Clip.findById(id);
    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 });
    }

    const project = await Project.findById(clip.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Parent project not found' }, { status: 404 });
    }

    // Update status to rendering
    clip.status = 'rendering';
    clip.captionStyle = captionStyle || clip.captionStyle;
    clip.cropFocus = cropFocus || clip.cropFocus;
    clip.captionLanguage = captionLanguage || clip.captionLanguage || 'original';
    clip.renderFormat = renderFormat || clip.renderFormat || 'vertical';
    
    if (transcript) {
      if (clip.captionLanguage === 'hinglish') {
        clip.hinglishTranscript = transcript;
      } else {
        clip.transcript = transcript;
      }
    }
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
    const relativeAssPath = `public/temp/${tempAssFileName}`;

    const verticalFileName = `${id}-vertical.mp4`;
    const horizontalFileName = `${id}-horizontal.mp4`;
    const verticalPath = path.join(outputsDir, verticalFileName);
    const horizontalPath = path.join(outputsDir, horizontalFileName);

    console.log(`RENDER API: Starting download section for clip ${id} (${clip.start}s to ${clip.end}s) using yt-dlp at ${settings.yt_dlp_path}`);
    // Step 1: Download clip section using custom yt-dlp and ffmpeg paths
    await downloadVideoClip(project.url, clip.start, clip.end, tempVideoPath, settings.yt_dlp_path, settings.ffmpeg_path);

    // Retrieve active transcript
    const activeTranscript = clip.captionLanguage === 'hinglish' && clip.hinglishTranscript && clip.hinglishTranscript.length > 0
      ? clip.hinglishTranscript
      : clip.transcript;

    // Step 2: Render Vertical Layout if selected
    if (clip.renderFormat === 'vertical' || clip.renderFormat === 'both') {
      console.log(`RENDER API: Rendering vertical layout with ffmpeg at ${settings.ffmpeg_path}...`);
      const assContentVertical = generateAssSubtitles(activeTranscript, clip.start, clip.captionStyle, false);
      fs.writeFileSync(tempAssPath, assContentVertical, 'utf8');
      await renderFinalShort(tempVideoPath, relativeAssPath, clip.cropFocus, clip.captionStyle, verticalPath, false, settings.ffmpeg_path);
      clip.videoPathVertical = `/outputs/${verticalFileName}`;
    }

    // Step 3: Render Horizontal Layout if selected
    if (clip.renderFormat === 'horizontal' || clip.renderFormat === 'both') {
      console.log(`RENDER API: Rendering horizontal layout with ffmpeg at ${settings.ffmpeg_path}...`);
      const assContentHorizontal = generateAssSubtitles(activeTranscript, clip.start, clip.captionStyle, true);
      fs.writeFileSync(tempAssPath, assContentHorizontal, 'utf8');
      await renderFinalShort(tempVideoPath, relativeAssPath, clip.cropFocus, clip.captionStyle, horizontalPath, true, settings.ffmpeg_path);
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
    const settings = extractSettings(req);
    await dbConnect(settings.mongodb_uri);

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
