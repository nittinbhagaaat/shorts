import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Clip from '@/models/Clip';
import { getYouTubeVideoData, fetchTranscript } from '@/lib/youtube';
import { identifyViralClips, transliterateHindiToHinglish } from '@/lib/ai';
import { extractSettings } from '@/lib/settings';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const settings = extractSettings(req, body);
    
    await dbConnect(settings.mongodb_uri);

    const { url } = body;
    if (!url) {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
    }

    console.log('[API PROJECT] Fetching video details for:', url);
    const videoData = await getYouTubeVideoData(url);
    const { videoId, title, channel, duration, thumbnail, captionTracks } = videoData;

    // Check if project already exists in database
    let project = await Project.findById(videoId);
    let clips = [];

    if (project) {
      clips = await Clip.find({ projectId: videoId }).sort({ start: 1 });
      if (clips.length > 0) {
        console.log(`[API PROJECT] Project already exists with ${clips.length} cached clips.`);
        return NextResponse.json({ project, clips });
      }
      console.log('[API PROJECT] Existing project had 0 clips. Re-generating clips...');
    }

    console.log('[API PROJECT] Fetching transcript...');
    let transcript = [];
    try {
      transcript = await fetchTranscript(captionTracks, videoId, duration);
    } catch (e) {
      console.warn('[API PROJECT] Could not fetch transcript from YouTube:', e.message);
    }

    // Check if transcript contains Devanagari text (Hindi)
    let hinglishTranscript = [...transcript];
    if (transcript.length > 0) {
      const fullText = transcript.map(s => s.text).join(' ');
      const containsHindi = /[\u0900-\u097F]/.test(fullText);
      if (containsHindi) {
        console.log('[API PROJECT] Hindi detected in transcript. Transliterating to Hinglish...');
        try {
          hinglishTranscript = await transliterateHindiToHinglish(transcript, settings);
          console.log('[API PROJECT] Transliteration successful.');
        } catch (translitErr) {
          console.warn('[API PROJECT] Transliteration skipped:', translitErr.message);
          hinglishTranscript = [...transcript];
        }
      }
    }

    // Upsert project
    if (!project) {
      project = await Project.create({
        _id: videoId,
        url,
        title,
        channel,
        duration,
        thumbnail,
        transcript,
        hinglishTranscript
      });
    } else {
      project.title = title !== 'Viral Video Project' ? title : project.title;
      project.channel = channel !== 'YouTube Creator' ? channel : project.channel;
      project.duration = duration || project.duration || 180;
      project.thumbnail = thumbnail || project.thumbnail;
      project.transcript = transcript.length > 0 ? transcript : project.transcript;
      project.hinglishTranscript = hinglishTranscript.length > 0 ? hinglishTranscript : project.hinglishTranscript;
      await project.save();
    }

    console.log('[API PROJECT] Calling AI to identify viral clips...');
    const rawClips = await identifyViralClips(hinglishTranscript, duration, settings);

    // Save clips to DB
    clips = await Promise.all(rawClips.map(c => {
      const clipSegments = transcript.filter(s => s.start >= c.start && s.start <= c.end);
      const clipHinglishSegments = hinglishTranscript.filter(s => s.start >= c.start && s.start <= c.end);
      
      return Clip.create({
        projectId: videoId,
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

    console.log(`[API PROJECT] Successfully created project with ${clips.length} clips.`);
    return NextResponse.json({ project, clips });
  } catch (error) {
    console.error('[API PROJECT] Error processing video:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const settings = extractSettings(req);
    await dbConnect(settings.mongodb_uri);
    
    const projects = await Project.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('[API PROJECT] Error fetching projects:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
