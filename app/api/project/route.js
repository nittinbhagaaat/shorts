import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Clip from '@/models/Clip';
import { getYouTubeVideoData, fetchTranscript } from '@/lib/youtube';
import { identifyViralClips, generateIntelligentFallbackClips, transliterateHindiToHinglish, translateTranscriptToEnglish } from '@/lib/ai';
import { devanagariToHinglish, transliterateTranscript } from '@/lib/transliterate';
import { generateShortMetadata } from '@/lib/youtubeMetadata';
import { extractServerConfig } from '@/lib/serverConfig';
import { getAuthUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { mongodbUri, aiConfig, ytDlpPath } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const session = await getAuthUser(req);
    if (!session?.id) {
      return NextResponse.json(
        { error: 'Please sign in to create and manage workspaces.' },
        { status: 401 }
      );
    }
    const userId = session.id;

    const body = await req.json();
    const { url, clipCount = 5, regenerate = false, minDuration = 30, maxDuration = 60 } = body;
    const isSubtitlesEnabled = false;
    if (!url) {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
    }

    const targetClips = Math.min(20, Math.max(1, parseInt(clipCount, 10) || 5));
    const parsedMin = Math.max(10, Math.min(180, parseInt(minDuration, 10) || 30));
    const parsedMax = Math.max(parsedMin + 5, Math.min(300, parseInt(maxDuration, 10) || 60));
    console.log(`API PROJECT: Processing video with targetClips=${targetClips}, duration=${parsedMin}s-${parsedMax}s for user=${userId}:`, url);

    const videoData = await getYouTubeVideoData(url, ytDlpPath);
    const { videoId, title, channel, duration, thumbnail, captionTracks } = videoData;

    // Isolate workspace per user: projectId is prefixed by userId
    const projectId = `${userId}_${videoId}`;

    // Check if project already exists for this user
    let project = await Project.findById(projectId);
    let clips = [];

    const durationMatches = project && project.minDuration === parsedMin && project.maxDuration === parsedMax && project.targetClips === targetClips;
    if (project && !regenerate && durationMatches) {
      clips = await Clip.find({ projectId }).sort({ start: 1 });
      if (clips.length > 0 && project.title !== 'Untitled Video' && project.duration > 0) {
        console.log(`API PROJECT: Found existing healthy project ${projectId} with ${clips.length} clips matching duration bounds.`);
        return NextResponse.json({ project, clips });
      }
      console.log('API PROJECT: Project exists but clips are missing or metadata was incomplete. Re-processing...');
    }

    console.log('API PROJECT: Fetching transcript...');
    let transcript = [];
    try {
      transcript = await fetchTranscript(captionTracks, videoId, ytDlpPath);
    } catch (e) {
      console.warn('Could not fetch transcript from YouTube:', e.message);
      // Fallback clips will be generated
    }

    // Check language content (e.g. Hindi Devanagari)
    let hinglishTranscript = [...transcript];
    let englishTranscript = [...transcript];
    const fullText = transcript.map(s => s.text).join(' ');
    const containsHindi = /[\u0900-\u097F]/.test(fullText);

    if (transcript.length > 0) {
      if (containsHindi) {
        console.log('API PROJECT: Hindi detected. Generating Hinglish & English transcripts with AI...');
        try {
          hinglishTranscript = await transliterateHindiToHinglish(transcript, aiConfig);
          console.log('API PROJECT: Hinglish transliteration successful.');
        } catch (translitErr) {
          console.error('API PROJECT: Hinglish transliteration error:', translitErr.message);
          hinglishTranscript = transliterateTranscript(transcript);
        }

        try {
          englishTranscript = await translateTranscriptToEnglish(transcript, aiConfig);
          console.log('API PROJECT: English translation successful.');
        } catch (transErr) {
          console.error('API PROJECT: English translation error:', transErr.message);
          englishTranscript = [...transcript];
        }
      } else {
        // Video is in English or Roman script already
        hinglishTranscript = [...transcript];
        englishTranscript = [...transcript];
      }
    }

    // Save or update project
    if (project) {
      if (title && title !== 'Untitled Video') project.title = title;
      if (channel && channel !== 'Unknown Channel') project.channel = channel;
      if (duration && duration > 0) project.duration = duration;
      if (thumbnail) project.thumbnail = thumbnail;
      project.transcript = transcript;
      project.hinglishTranscript = hinglishTranscript;
      project.englishTranscript = englishTranscript;
      project.targetClips = targetClips;
      project.minDuration = parsedMin;
      project.maxDuration = parsedMax;
      project.userId = userId;
      project.videoId = videoId;
      await project.save();
    } else {
      project = await Project.create({
        _id: projectId,
        userId,
        videoId,
        url,
        title,
        channel,
        duration,
        thumbnail,
        transcript,
        hinglishTranscript,
        englishTranscript,
        targetClips,
        minDuration: parsedMin,
        maxDuration: parsedMax
      });
    }

    // Call AI to identify viral clips matching requested targetClips and duration bounds
    console.log(`API PROJECT: Calling AI (${aiConfig.provider}) to identify ${targetClips} viral clips between ${parsedMin}s and ${parsedMax}s...`);
    const workingTranscript = containsHindi ? hinglishTranscript : transcript;
    let rawClips = await identifyViralClips(workingTranscript, duration, aiConfig, {
      title,
      channel,
      targetClips,
      minDuration: parsedMin,
      maxDuration: parsedMax
    });
    if (!rawClips || rawClips.length === 0) {
      rawClips = generateIntelligentFallbackClips(workingTranscript, duration, {
        title,
        channel,
        targetClips,
        minDuration: parsedMin,
        maxDuration: parsedMax
      });
    }

    // Delete existing clips for this project
    console.log(`API PROJECT: Refreshing clips in database for project ${projectId}...`);
    await Clip.deleteMany({ projectId });

    // Save clips to DB
    clips = await Promise.all(rawClips.map(c => {
      // Find segments overlapping with this clip's time range
      const clipSegments = transcript.filter(s => {
        const segEnd = (s.start || 0) + (s.duration || 2);
        return segEnd >= c.start && s.start <= c.end;
      });
      const rawHinglish = hinglishTranscript.filter(s => {
        const segEnd = (s.start || 0) + (s.duration || 2);
        return segEnd >= c.start && s.start <= c.end;
      });
      const clipHinglishSegments = containsHindi
        ? transliterateTranscript(rawHinglish.length > 0 ? rawHinglish : clipSegments)
        : rawHinglish;
      const clipEnglishSegments = englishTranscript.filter(s => {
        const segEnd = (s.start || 0) + (s.duration || 2);
        return segEnd >= c.start && s.start <= c.end;
      });

      const shortMeta = generateShortMetadata({
        title: devanagariToHinglish(c.title),
        description: devanagariToHinglish(c.description),
        transcript: clipSegments,
        duration: c.end - c.start,
      }, {
        title,
        channel,
        url
      });

      return Clip.create({
        projectId,
        userId,
        title: devanagariToHinglish(c.title),
        description: devanagariToHinglish(c.description),
        start: c.start,
        end: c.end,
        duration: c.end - c.start,
        status: 'pending',
        enableSubtitles: false,
        captionStyle: 'none',
        cropFocus: 'auto',
        captionPosition: 'lower',
        captionYPercent: 72,
        captionAlign: 'center',
        captionLanguage: containsHindi ? 'hinglish' : 'original',
        transcript: clipSegments,
        hinglishTranscript: clipHinglishSegments,
        englishTranscript: clipEnglishSegments,
        overlayText: '',
        overlayTextOpacity: 1.0,
        overlayTextYPercent: 14,
        overlayTextColor: '#FFFFFF',
        overlayTextSize: 'medium',
        overlayTextBg: true,
        // YouTube Shorts SEO Metadata
        youtubeTitle: shortMeta.youtubeTitle,
        youtubeDescription: shortMeta.youtubeDescription,
        tags: shortMeta.tags,
        hashtags: shortMeta.hashtags,
        seoKeywords: shortMeta.seoKeywords,
        youtubeUploadStatus: 'none'
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

    const session = await getAuthUser(req);
    if (!session?.id) {
      return NextResponse.json({ projects: [] });
    }

    const projects = await Project.find({ userId: session.id }).sort({ createdAt: -1 });
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('API PROJECT: Error fetching projects:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
