import mongoose from 'mongoose';

const UserLocationSchema = new mongoose.Schema({
  city: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true },
  countryCode: { type: String, default: '', trim: true },
  usersCount: { type: Number, default: 1 },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

UserLocationSchema.index({ city: 1, country: 1 }, { unique: true });

export default mongoose.models.UserLocation || mongoose.model('UserLocation', UserLocationSchema);
