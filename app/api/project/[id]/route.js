import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Clip from '@/models/Clip';
import { extractServerConfig } from '@/lib/serverConfig';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req, { params }) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);
    const resolvedParams = await params;
    const { id } = resolvedParams;

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const clips = await Clip.find({ projectId: id }).sort({ start: 1 });
    return NextResponse.json({ project, clips });
  } catch (error) {
    console.error('API PROJECT DETAIL: Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);
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
        clip.videoPathHorizontal
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
