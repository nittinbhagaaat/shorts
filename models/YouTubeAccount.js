import mongoose from 'mongoose';

const YouTubeAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  channelId: { type: String, required: true },
  channelTitle: { type: String, required: true },
  channelHandle: { type: String, default: '' },
  channelThumbnail: { type: String, default: '' },
  subscriberCount: { type: String, default: '0' },
  tokens: {
    access_token: String,
    refresh_token: String,
    scope: String,
    token_type: String,
    expiry_date: Number,
  },
  clientId: { type: String, default: '' },
  clientSecret: { type: String, default: '' },
  isConnected: { type: Boolean, default: true },
  connectedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.YouTubeAccount || mongoose.model('YouTubeAccount', YouTubeAccountSchema);
