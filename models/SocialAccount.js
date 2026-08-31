import mongoose from 'mongoose';

const SocialAccountSchema = new mongoose.Schema({
  platform: { type: String, required: true, unique: true }, // 'youtube' or 'instagram'
  accessToken: String,
  refreshToken: String,
  expiresAt: Date,
  accountName: String,
  instagramAccountId: String, // Meta specific Instagram Business Account ID
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.models.SocialAccount || mongoose.model('SocialAccount', SocialAccountSchema);
