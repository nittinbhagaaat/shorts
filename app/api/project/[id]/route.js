import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Clip from '@/models/Clip';
import { generateShortMetadata } from '@/lib/youtubeMetadata';
import { extractServerConfig } from '@/lib/serverConfig';
import { getYouTubeVideoData, fetchTranscript } from '@/lib/youtube';
import { identifyViralClips, generateIntelligentFallbackClips, transliterateHindiToHinglish, translateTranscriptToEnglish } from '@/lib/ai';
import { devanagariToHinglish, transliterateTranscript } from '@/lib/transliterate';
import { getAuthUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req, { params }) {
  try {
    const { mongodbUri, aiConfig, ytDlpPath } = extractServerConfig(req);
    await dbConnect(mongodbUri);
    const session = await getAuthUser(req);
    if (!session?.id) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to view this workspace.' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    // First: Look for a project belonging to this user (matches id, prefixed id, or videoId)
    let project = await Project.findOne({
      $or: [
        { _id: id, userId: session.id },
        { _id: `${session.id}_${id}` },
        { videoId: id, userId: session.id },
      ],
    });

    // If not found by user, check if direct ID exists
    if (!project) {
      project = await Project.findById(id);
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Access control: only the workspace owner can access this project
    if (project.userId) {
      if (session.id !== project.userId.toString()) {
        return NextResponse.json(
          { error: 'Access denied. You do not have permission to view this workspace.' },
          { status: 403 }
        );
      }
    } else {
      // Claim legacy project for this user
      project.userId = session.id;
      await project.save();
      await Clip.updateMany({ projectId: project._id }, { $set: { userId: session.id } });
    }

    let clips = await Clip.find({ projectId: project._id }).sort({ start: 1 });

    // Self-healing: If workspace has 0 clips or default/empty metadata, automatically generate and save them
    if (clips.length === 0 || project.title === 'Untitled Video' || !project.duration || project.duration === 0) {
      console.log(`API PROJECT DETAIL: Self-healing workspace for ${id} (clips=${clips.length}, title="${project.title}")...`);
      try {
        const videoData = await getYouTubeVideoData(project.url || `https://www.youtube.com/watch?v=${id}`, ytDlpPath);
        if (videoData.title && videoData.title !== 'Untitled Video') project.title = videoData.title;
        if (videoData.channel && videoData.channel !== 'Unknown Channel') project.channel = videoData.channel;
        if (videoData.duration > 0) project.duration = videoData.duration;
        if (videoData.thumbnail) project.thumbnail = videoData.thumbnail;

        let transcript = (project.transcript && project.transcript.length > 0) ? project.transcript : [];
        if (transcript.length === 0) {
          try {
            transcript = await fetchTranscript(videoData.captionTracks, id, ytDlpPath);
            project.transcript = transcript;
          } catch (_) {}
        }

        const targetClips = project.targetClips || 5;
        const fullText = transcript.map(s => s.text).join(' ');
        const containsHindi = /[\u0900-\u097F]/.test(fullText);

        let workingTranscript = transcript;
        if (transcript.length > 0 && containsHindi) {
          if (!project.hinglishTranscript || project.hinglishTranscript.length === 0) {
            try {
              project.hinglishTranscript = await transliterateHindiToHinglish(transcript, aiConfig);
            } catch (_) {
              project.hinglishTranscript = transliterateTranscript(transcript);
            }
          }
          workingTranscript = project.hinglishTranscript || transcript;
        }

        let rawClips = await identifyViralClips(workingTranscript, project.duration, aiConfig, {
          title: project.title,
          channel: project.channel,
          targetClips
        });
        if (!rawClips || rawClips.length === 0) {
          rawClips = generateIntelligentFallbackClips(workingTranscript, project.duration, {
            title: project.title,
            channel: project.channel,
            targetClips
          });
        }

        await Clip.deleteMany({ projectId: id });
        clips = await Promise.all(rawClips.map(c => {
          const clipSegments = transcript.filter(s => {
            const segEnd = (s.start || 0) + (s.duration || 2);
            return segEnd >= c.start && s.start <= c.end;
          });
          const shortMeta = generateShortMetadata({
            title: devanagariToHinglish(c.title),
            description: devanagariToHinglish(c.description),
            transcript: clipSegments,
            duration: c.end - c.start,
          }, {
            title: project.title,
            channel: project.channel,
            url: project.url || `https://www.youtube.com/watch?v=${id}`
          });

          return Clip.create({
            projectId: id,
            title: devanagariToHinglish(c.title),
            description: devanagariToHinglish(c.description),
            start: c.start,
            end: c.end,
            duration: c.end - c.start,
            status: 'pending',
            enableSubtitles: true,
            captionStyle: 'hormozi',
            cropFocus: 'auto',
            captionPosition: 'lower',
            captionYPercent: 72,
            captionAlign: 'center',
            captionLanguage: containsHindi ? 'hinglish' : 'original',
            transcript: clipSegments,
            hinglishTranscript: clipSegments,
            englishTranscript: clipSegments,
            overlayText: '',
            overlayTextOpacity: 1.0,
            overlayTextYPercent: 14,
            overlayTextColor: '#FFFFFF',
            overlayTextSize: 'medium',
            overlayTextBg: true,
            youtubeTitle: shortMeta.youtubeTitle,
            youtubeDescription: shortMeta.youtubeDescription,
            tags: shortMeta.tags,
            hashtags: shortMeta.hashtags,
            seoKeywords: shortMeta.seoKeywords,
            youtubeUploadStatus: 'none'
          });
        }));

        await project.save();
        console.log(`API PROJECT DETAIL: Workspace self-healed successfully with ${clips.length} clips!`);
      } catch (healingErr) {
        console.error('API PROJECT DETAIL: Self-healing error:', healingErr.message);
      }
    }

    // Auto-populate missing YouTube Shorts SEO metadata on existing clips
    for (const clip of clips) {
      if (!clip.youtubeTitle || !clip.youtubeDescription) {
        const meta = generateShortMetadata(clip, {
          title: project.title,
          channel: project.channel,
          url: project.url,
        });
        clip.youtubeTitle = meta.youtubeTitle;
        clip.youtubeDescription = meta.youtubeDescription;
        clip.tags = meta.tags;
        clip.hashtags = meta.hashtags;
        clip.seoKeywords = meta.seoKeywords;
        await clip.save();
      }
    }

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
    const session = await getAuthUser(req);
    if (!session?.id) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    let project = await Project.findOne({
      $or: [
        { _id: id, userId: session.id },
        { _id: `${session.id}_${id}` },
        { videoId: id, userId: session.id },
      ],
    });

    if (!project) {
      project = await Project.findById(id);
    }

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.userId && session.id !== project.userId.toString()) {
      return NextResponse.json(
        { error: 'Access denied. You do not have permission to delete this workspace.' },
        { status: 403 }
      );
    }

    const projectIdToDelete = project._id;

    // Find all clips belonging to this project
    const clips = await Clip.find({ projectId: projectIdToDelete });

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
    await Clip.deleteMany({ projectId: projectIdToDelete });

    // Delete project from MongoDB
    await Project.findByIdAndDelete(projectIdToDelete);

    console.log(`API PROJECT DELETE: Successfully deleted workspace for project ${projectIdToDelete}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API PROJECT DELETE: Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
