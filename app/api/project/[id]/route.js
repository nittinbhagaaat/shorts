import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Clip from '@/models/Clip';
import { identifyViralClips } from '@/lib/ai';
import { extractSettings } from '@/lib/settings';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req, { params }) {
  try {
    const settings = extractSettings(req);
    if (!settings.mongodb_uri || !settings.mongodb_uri.trim()) {
      return NextResponse.json({ error: 'MongoDB connection string is required' }, { status: 400 });
    }
    await dbConnect(settings.mongodb_uri);

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let clips = await Clip.find({ projectId: id }).sort({ start: 1 });

    // Auto-repair: If workspace was saved with 0 clips, generate them immediately
    if (clips.length === 0) {
      console.log(`[API PROJECT DETAIL] Project ${id} has 0 clips. Auto-generating clips...`);
      const rawClips = await identifyViralClips(
        project.hinglishTranscript || project.transcript || [],
        project.duration || 180,
        settings
      );

      clips = await Promise.all(rawClips.map(c => {
        const transcript = project.transcript || [];
        const hinglishTranscript = project.hinglishTranscript || [];
        const clipSegments = transcript.filter(s => s.start >= c.start && s.start <= c.end);
        const clipHinglishSegments = hinglishTranscript.filter(s => s.start >= c.start && s.start <= c.end);
        
        return Clip.create({
          projectId: id,
          title: c.title,
          description: c.description,
          start: c.start,
          end: c.end,
          duration: c.end - c.start,
          status: 'pending',
          transcript: clipSegments,
          hinglishTranscript: clipHinglishSegments
        });
      }));
    }

    return NextResponse.json({ project, clips });
  } catch (error) {
    console.error('API PROJECT DETAIL: Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const settings = extractSettings(req);
    await dbConnect(settings.mongodb_uri);

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Find all clips belonging to this project
    const clips = await Clip.find({ projectId: id });

    // Delete associated rendered video files from disk
    clips.forEach(clip => {
      const filesToDelete = [
        clip.videoPath,
        clip.videoPathVertical,
        clip.videoPathHorizontal,
        `/outputs/${clip._id}-vertical.mp4`,
        `/outputs/${clip._id}-horizontal.mp4`,
        `/outputs/${clip._id}.mp4`
      ].filter(Boolean);

      filesToDelete.forEach(relPath => {
        const filePath = path.join(process.cwd(), 'public', relPath);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`API PROJECT DELETE: Deleted file ${filePath}`);
          }
        } catch (fileErr) {
          console.error(`API PROJECT DELETE: Failed to delete file ${filePath}:`, fileErr.message);
        }
      });
    });

    // Delete clips from MongoDB
    await Clip.deleteMany({ projectId: id });

    // Delete project from MongoDB
    await Project.findByIdAndDelete(id);

    console.log(`API PROJECT DELETE: Successfully deleted workspace for project ${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API PROJECT DELETE: Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
