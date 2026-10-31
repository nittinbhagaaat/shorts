import mongoose from 'mongoose';

const SystemSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  updatedBy: {
    type: String,
    default: 'system',
  },
});

export default mongoose.models.SystemSetting || mongoose.model('SystemSetting', SystemSettingSchema);

