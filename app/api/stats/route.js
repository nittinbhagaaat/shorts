import dbConnect from '@/lib/db';
import Clip from '@/models/Clip';
import { extractServerConfig } from '@/lib/serverConfig';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    // Count clips in DB
    const dbClipsCount = await Clip.countDocuments();

    // Also count completed clips if any
    const completedClipsCount = await Clip.countDocuments({ status: 'completed' });

    // Fallback: count rendered mp4 files in public/outputs if DB has fewer
    let fileCount = 0;
    try {
      const outputsDir = path.join(process.cwd(), 'public', 'outputs');
      if (fs.existsSync(outputsDir)) {
        const files = fs.readdirSync(outputsDir);
        fileCount = files.filter(f => f.endsWith('.mp4')).length;
      }
    } catch (_) {}

    const totalShorts = Math.max(dbClipsCount, fileCount);

    return NextResponse.json({
      totalShorts,
      completedShorts: completedClipsCount,
    });
  } catch (error) {
    console.error('API STATS: Failed to fetch clip stats:', error.message);
    return NextResponse.json({ totalShorts: 0, completedShorts: 0 });
  }
}
