import mongoose from 'mongoose';

const YouTubeUploadSchema = new mongoose.Schema({
  clipId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clip', required: true },
  projectId: { type: String, required: true },
  channelId: { type: String, default: '' },
  channelTitle: { type: String, default: '' },
  youtubeVideoId: { type: String, default: '' },
  youtubeVideoUrl: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  tags: [{ type: String }],
  hashtags: [{ type: String }],
  seoKeywords: [{ type: String }],
  privacyStatus: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public',
  },
  isScheduled: { type: Boolean, default: false },
  scheduledPublishTime: { type: Date, default: null },
  status: {
    type: String,
    enum: ['uploaded', 'scheduled', 'failed'],
    default: 'uploaded',
  },
  errorMessage: { type: String, default: '' },
  videoPath: { type: String, default: '' },
  thumbnailUrl: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.models.YouTubeUpload || mongoose.model('YouTubeUpload', YouTubeUploadSchema);
