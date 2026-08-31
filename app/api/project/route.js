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

    console.log('API PROJECT: Fetching video details for:', url);
    const videoData = await getYouTubeVideoData(url);
    const { videoId, title, channel, duration, thumbnail, captionTracks } = videoData;

    // Check if project already exists in database
    let project = await Project.findById(videoId);
    let clips = [];

    if (project) {
      console.log('API PROJECT: Project already exists in DB. Returning cached clips.');
      clips = await Clip.find({ projectId: videoId }).sort({ start: 1 });
      return NextResponse.json({ project, clips });
    }

    console.log('API PROJECT: Fetching transcript...');
    let transcript = [];
    try {
      transcript = await fetchTranscript(captionTracks, videoId);
    } catch (e) {
      console.warn('Could not fetch transcript from YouTube:', e.message);
      // We will proceed with an empty transcript, which will trigger fallback clips
    }

    // Check if transcript contains Devanagari text (Hindi)
    let hinglishTranscript = [...transcript];
    if (transcript.length > 0) {
      const fullText = transcript.map(s => s.text).join(' ');
      const containsHindi = /[\u0900-\u097F]/.test(fullText);
      if (containsHindi) {
        console.log('API PROJECT: Hindi detected in transcript. Transliterating to Hinglish...');
        try {
          hinglishTranscript = await transliterateHindiToHinglish(transcript, settings);
          console.log('API PROJECT: Transliteration successful.');
        } catch (translitErr) {
          console.error('API PROJECT: Hindi-to-Hinglish transliteration failed. Keeping original text.', translitErr.message);
          hinglishTranscript = [...transcript];
        }
      }
    }

    // Save project metadata, transcript, and hinglish transcript
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

    console.log('API PROJECT: Calling AI to identify viral clips with configured AI settings...');
    // We send Hinglish transcript to the clipper so that the generated titles and descriptions are in Roman/Hinglish script
    const rawClips = await identifyViralClips(hinglishTranscript, duration, settings);

    // Save clips to DB
    clips = await Promise.all(rawClips.map(c => {
      // Find segments overlapping with this clip's time range
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

    console.log(`API PROJECT: Successfully created project with ${clips.length} clips.`);
    return NextResponse.json({ project, clips });
  } catch (error) {
    console.error('API PROJECT: Error processing video:', error);
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
    console.error('API PROJECT: Error fetching projects:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
