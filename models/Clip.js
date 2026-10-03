import mongoose from 'mongoose';

const SubtitleWordSchema = new mongoose.Schema({
  text: String,
  start: Number, // relative to clip start (seconds)
  end: Number // relative to clip start (seconds)
});

const ClipSchema = new mongoose.Schema({
  projectId: { type: String, ref: 'Project', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  title: String,
  description: String, // Why it's viral
  start: Number, // start time in original video (seconds)
  end: Number, // end time in original video (seconds)
  duration: Number, // length in seconds
  status: { type: String, enum: ['pending', 'rendering', 'completed', 'failed'], default: 'pending' },
  enableSubtitles: { type: Boolean, default: true },
  captionStyle: { type: String, default: 'hormozi' }, // hormozi, mrbeast, neon, minimalist, classic, karaoke, retro, cinematic, bold_badge, comic, none
  cropFocus: { type: String, default: 'auto' }, // auto (active speaker tracking), center, left, right
  captionPosition: { type: String, default: 'lower' }, // top, upper, center, lower, bottom, custom
  captionYPercent: { type: Number, default: 72 }, // 10 to 90 % from top
  captionAlign: { type: String, default: 'center' }, // center, left, right
  transcript: [{
    text: String,
    start: Number, // relative to video start (seconds)
    duration: Number
  }],
  hinglishTranscript: [{
    text: String,
    start: Number, // relative to video start (seconds)
    duration: Number
  }],
  englishTranscript: [{
    text: String,
    start: Number, // relative to video start (seconds)
    duration: Number
  }],
  captionLanguage: { type: String, default: 'original' }, // original, hinglish, english
  overlayText: { type: String, default: '' },
  overlayTextOpacity: { type: Number, default: 1.0 },
  overlayTextYPercent: { type: Number, default: 14 },
  overlayTextColor: { type: String, default: '#FFFFFF' },
  overlayTextSize: { type: String, default: 'medium' },
  overlayTextBg: { type: Boolean, default: true },
  words: [SubtitleWordSchema], // Word-level transcript if available
  videoPath: String, // Path to local file (e.g. /public/outputs/clipId.mp4)
  videoPathVertical: String,
  videoPathHorizontal: String,
  renderFormat: { type: String, enum: ['vertical', 'horizontal', 'both'], default: 'vertical' },
  // YouTube Shorts Publishing & SEO Metadata
  youtubeTitle: { type: String, default: '' },
  youtubeDescription: { type: String, default: '' },
  tags: [{ type: String }],
  hashtags: [{ type: String }],
  seoKeywords: [{ type: String }],
  youtubeUploadStatus: { type: String, enum: ['none', 'scheduled', 'uploaded', 'failed'], default: 'none' },
  youtubeVideoId: { type: String, default: '' },
  youtubeVideoUrl: { type: String, default: '' },
  youtubeScheduledTime: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

if (process.env.NODE_ENV !== 'production' && mongoose.models.Clip) {
  delete mongoose.models.Clip;
}

export default mongoose.models.Clip || mongoose.model('Clip', ClipSchema);
