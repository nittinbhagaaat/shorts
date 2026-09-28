import dbConnect from '@/lib/db';
import Project from '@/models/Project';
import Clip from '@/models/Clip';
import { getYouTubeVideoData, fetchTranscript } from '@/lib/youtube';
import { identifyViralClips, transliterateHindiToHinglish, translateTranscriptToEnglish } from '@/lib/ai';
import { devanagariToHinglish, transliterateTranscript } from '@/lib/transliterate';
import { generateShortMetadata } from '@/lib/youtubeMetadata';
import { extractServerConfig } from '@/lib/serverConfig';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { mongodbUri, aiConfig } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const body = await req.json();
    const { url, clipCount = 5, regenerate = false } = body;
    const isSubtitlesEnabled = typeof body.enableSubtitles === 'boolean' ? body.enableSubtitles : true;
    if (!url) {
      return NextResponse.json({ error: 'YouTube URL is required' }, { status: 400 });
    }

    const targetClips = Math.min(20, Math.max(1, parseInt(clipCount, 10) || 5));
    console.log(`API PROJECT: Processing video with targetClips=${targetClips}:`, url);

    const videoData = await getYouTubeVideoData(url);
    const { videoId, title, channel, duration, thumbnail, captionTracks } = videoData;

    // Check if project already exists in database
    let project = await Project.findById(videoId);
    let clips = [];

    if (project && !regenerate) {
      console.log('API PROJECT: Project already exists in DB. Checking existing clips...');
      clips = await Clip.find({ projectId: videoId }).sort({ start: 1 });
      if (clips.length > 0) {
        return NextResponse.json({ project, clips });
      }
    }

    console.log('API PROJECT: Fetching transcript...');
    let transcript = [];
    try {
      transcript = await fetchTranscript(captionTracks, videoId);
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
      project.transcript = transcript;
      project.hinglishTranscript = hinglishTranscript;
      project.englishTranscript = englishTranscript;
      project.targetClips = targetClips;
      await project.save();
    } else {
      project = await Project.create({
        _id: videoId,
        url,
        title,
        channel,
        duration,
        thumbnail,
        transcript,
        hinglishTranscript,
        englishTranscript,
        targetClips
      });
    }

    // Call AI to identify viral clips matching requested targetClips
    console.log(`API PROJECT: Calling AI (${aiConfig.provider}) to identify ${targetClips} viral clips...`);
    const workingTranscript = containsHindi ? hinglishTranscript : transcript;
    const rawClips = await identifyViralClips(workingTranscript, duration, aiConfig, { title, channel, targetClips });

    if (regenerate) {
      console.log(`API PROJECT: Deleting previous clips for project ${videoId} prior to regeneration...`);
      await Clip.deleteMany({ projectId: videoId });
    }

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
        projectId: videoId,
        title: devanagariToHinglish(c.title),
        description: devanagariToHinglish(c.description),
        start: c.start,
        end: c.end,
        duration: c.end - c.start,
        status: 'pending',
        enableSubtitles: isSubtitlesEnabled,
        captionStyle: isSubtitlesEnabled ? 'hormozi' : 'none',
        cropFocus: 'auto', // Default to smart active speaker tracking!
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
    const projects = await Project.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('API PROJECT: Error fetching projects:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
