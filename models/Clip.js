import mongoose from 'mongoose';

const SubtitleWordSchema = new mongoose.Schema({
  text: String,
  start: Number, // relative to clip start (seconds)
  end: Number // relative to clip start (seconds)
});

const ClipSchema = new mongoose.Schema({
  projectId: { type: String, ref: 'Project', required: true },
  title: String,
  description: String, // Why it's viral
  start: Number, // start time in original video (seconds)
  end: Number, // end time in original video (seconds)
  duration: Number, // length in seconds
  status: { type: String, enum: ['pending', 'rendering', 'completed', 'failed'], default: 'pending' },
  captionStyle: { type: String, default: 'hormozi' }, // hormozi, minimalist, classic
  cropFocus: { type: String, default: 'center' }, // center, left, right
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
  captionLanguage: { type: String, default: 'original' }, // original, hinglish
  words: [SubtitleWordSchema], // Word-level transcript if available
  videoPath: String, // Path to local file (e.g. /public/outputs/clipId.mp4)
  videoPathVertical: String,
  videoPathHorizontal: String,
  renderFormat: { type: String, enum: ['vertical', 'horizontal', 'both'], default: 'vertical' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Clip || mongoose.model('Clip', ClipSchema);
