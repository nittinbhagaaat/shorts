// app/api/youtube/upload/route.js
import dbConnect from '@/lib/db';
import Clip from '@/models/Clip';
import Project from '@/models/Project';
import YouTubeUpload from '@/models/YouTubeUpload';
import { uploadShortToYouTube } from '@/lib/youtubeClient';
import { extractServerConfig } from '@/lib/serverConfig';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function POST(req) {
  try {
    const { mongodbUri } = extractServerConfig(req);
    await dbConnect(mongodbUri);

    const body = await req.json();
    const {
      clipId,
      title,
      description,
      tags = [],
      hashtags = [],
      seoKeywords = [],
      privacyStatus = 'public',
      scheduledPublishTime = null,
    } = body;

    if (!clipId) {
      return NextResponse.json({ error: 'Clip ID is required for upload.' }, { status: 400 });
    }

    const clip = await Clip.findById(clipId);
    if (!clip) {
      return NextResponse.json({ error: 'Clip not found.' }, { status: 404 });
    }

    const project = await Project.findById(clip.projectId);

    // Strict validation: Only Shorts are allowed
    if (clip.duration > 90) {
      return NextResponse.json(
        { error: `This platform only uploads YouTube Shorts (duration max 90 seconds). This clip is ${clip.duration}s.` },
        { status: 400 }
      );
    }

    // Determine vertical video file path
    let relVideoPath = clip.videoPathVertical || clip.videoPath;
    if (!relVideoPath) {
      // Check if rendered file exists in public/outputs
      const potentialVertical = path.join(process.cwd(), 'public', 'outputs', `${clipId}-vertical.mp4`);
      if (fs.existsSync(potentialVertical)) {
        relVideoPath = `/outputs/${clipId}-vertical.mp4`;
        clip.videoPathVertical = relVideoPath;
        clip.videoPath = relVideoPath;
        await clip.save();
      } else {
        return NextResponse.json(
          { error: 'Vertical short has not been rendered yet. Please click "Render Video Short" before uploading.' },
          { status: 400 }
        );
      }
    }

    // Clean relative path into absolute local filesystem path
    const cleanRelPath = relVideoPath.replace(/^\//, '');
    const absoluteVideoPath = path.join(process.cwd(), 'public', cleanRelPath.replace(/^outputs\//, 'outputs/'));

    if (!fs.existsSync(absoluteVideoPath)) {
      return NextResponse.json(
        { error: `Rendered video file not found at ${absoluteVideoPath}. Please re-render this clip.` },
        { status: 400 }
      );
    }

    // Prepare title (ensure #Shorts)
    let uploadTitle = (title || clip.youtubeTitle || clip.title || 'Viral Moment').trim();
    if (!uploadTitle.toLowerCase().includes('#shorts')) {
      uploadTitle = `${uploadTitle} #Shorts`;
    }

    // Prepare tags
    const combinedTags = Array.from(new Set([
      'shorts',
      'youtube shorts',
      'viral shorts',
      ...(Array.isArray(tags) ? tags : []),
      ...(clip.tags || [])
    ])).slice(0, 20);

    // Call uploadShortToYouTube
    const uploadResult = await uploadShortToYouTube({
      videoFilePath: absoluteVideoPath,
      title: uploadTitle,
      description: description || clip.youtubeDescription || '',
      tags: combinedTags,
      privacyStatus,
      scheduledPublishTime,
      mongodbUri,
    });

    // Save record in YouTubeUpload collection
    const uploadRecord = await YouTubeUpload.create({
      clipId: clip._id,
      projectId: clip.projectId,
      channelId: uploadResult.channelId,
      channelTitle: uploadResult.channelTitle,
      youtubeVideoId: uploadResult.videoId,
      youtubeVideoUrl: uploadResult.shortUrl,
      title: uploadTitle,
      description: description || clip.youtubeDescription || '',
      tags: combinedTags,
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      seoKeywords: Array.isArray(seoKeywords) ? seoKeywords : [],
      privacyStatus,
      isScheduled: uploadResult.isScheduled,
      scheduledPublishTime: uploadResult.scheduledPublishTime,
      status: uploadResult.status,
      videoPath: relVideoPath,
      thumbnailUrl: project?.thumbnail || '',
      duration: clip.duration || 0,
    });

    // Update Clip model
    clip.youtubeUploadStatus = uploadResult.status;
    clip.youtubeVideoId = uploadResult.videoId;
    clip.youtubeVideoUrl = uploadResult.shortUrl;
    clip.youtubeScheduledTime = uploadResult.scheduledPublishTime;
    clip.youtubeTitle = uploadTitle;
    clip.youtubeDescription = description || clip.youtubeDescription || '';
    clip.tags = combinedTags;
    clip.hashtags = Array.isArray(hashtags) ? hashtags : clip.hashtags;
    clip.seoKeywords = Array.isArray(seoKeywords) ? seoKeywords : clip.seoKeywords;
    await clip.save();

    console.log(`API YOUTUBE UPLOAD: Successfully processed ${uploadResult.status} Short for clip ${clipId}`);

    return NextResponse.json({
      success: true,
      upload: uploadRecord,
      clip,
      shortUrl: uploadResult.shortUrl,
      isScheduled: uploadResult.isScheduled,
      message: uploadResult.isScheduled
        ? `Short successfully scheduled for ${new Date(uploadResult.scheduledPublishTime).toLocaleString()}`
        : 'Short successfully published to YouTube!',
    });
  } catch (err) {
    console.error('API YOUTUBE UPLOAD: Error uploading short:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload short to YouTube.' }, { status: 500 });
  }
}
