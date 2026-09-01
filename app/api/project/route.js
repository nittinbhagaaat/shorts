import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Clip from '@/models/Clip';
import { getYouTubeVideoData, fetchTranscript } from '@/lib/youtube';
import { identifyViralClips, transliterateHindiToHinglish } from '@/lib/ai';
import { extractServerConfig } from '@/lib/serverConfig';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { mongodbUri, aiConfig } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const { url } = await req.json();
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
      // Fallback clips will be generated
    }

    // Check if transcript contains Devanagari text (Hindi)
    let hinglishTranscript = [...transcript];
    if (transcript.length > 0) {
      const fullText = transcript.map(s => s.text).join(' ');
      const containsHindi = /[\u0900-\u097F]/.test(fullText);
      if (containsHindi) {
        console.log('API PROJECT: Hindi detected in transcript. Transliterating to Hinglish with AI...');
        try {
          hinglishTranscript = await transliterateHindiToHinglish(transcript, aiConfig);
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

    console.log(`API PROJECT: Calling AI (${aiConfig.provider}) to identify viral clips...`);
    const rawClips = await identifyViralClips(hinglishTranscript, duration, aiConfig, { title, channel });

    // Save clips to DB
    clips = await Promise.all(rawClips.map(c => {
      // Find all segments overlapping with this clip's time range
      const clipSegments = transcript.filter(s => {
        const segEnd = (s.start || 0) + (s.duration || 2);
        return segEnd >= c.start && s.start <= c.end;
      });
      const clipHinglishSegments = hinglishTranscript.filter(s => {
        const segEnd = (s.start || 0) + (s.duration || 2);
        return segEnd >= c.start && s.start <= c.end;
      });
      
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
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);
    const projects = await Project.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('API PROJECT: Error fetching projects:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
