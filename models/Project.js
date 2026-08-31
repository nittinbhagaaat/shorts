import mongoose from 'mongoose';

const TranscriptSegmentSchema = new mongoose.Schema({
  text: String,
  start: Number, // in seconds
  duration: Number // in seconds
});

const ProjectSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // YouTube Video ID (e.g. dQw4w9WgXcQ)
  url: { type: String, required: true },
  title: String,
  channel: String,
  duration: Number, // in seconds
  thumbnail: String,
  transcript: [TranscriptSegmentSchema],
  hinglishTranscript: [TranscriptSegmentSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
