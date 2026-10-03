import mongoose from 'mongoose';

const TranscriptSegmentSchema = new mongoose.Schema({
  text: String,
  start: Number, // in seconds
  duration: Number // in seconds
});

const ProjectSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // `${userId}_${videoId}` or legacy `${videoId}`
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  videoId: { type: String },
  url: { type: String, required: true },
  title: String,
  channel: String,
  duration: Number, // in seconds
  thumbnail: String,
  transcript: [TranscriptSegmentSchema],
  hinglishTranscript: [TranscriptSegmentSchema],
  englishTranscript: [TranscriptSegmentSchema],
  targetClips: { type: Number, default: 5 },
  minDuration: { type: Number, default: 30 }, // in seconds
  maxDuration: { type: Number, default: 60 }, // in seconds
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
