import mongoose from 'mongoose';

const VisitorImpactSchema = new mongoose.Schema({
  ip: { type: String, index: true },
  country: { type: String, required: true, index: true },
  countryCode: { type: String, default: '', index: true },
  city: { type: String, default: '' },
  region: { type: String, default: '' },
  timezone: { type: String, default: '' },
  language: { type: String, default: '' },
  device: { type: String, default: '' },
  platform: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
  clipsGenerated: { type: Number, default: 0 },
  projectsCreated: { type: Number, default: 0 },
  visits: { type: Number, default: 1 },
  lastSeen: { type: Date, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now },
});

// Update lastSeen on save
VisitorImpactSchema.pre('save', function (next) {
  this.lastSeen = new Date();
  if (typeof next === 'function') next();
});

export default mongoose.models.VisitorImpact || mongoose.model('VisitorImpact', VisitorImpactSchema);
