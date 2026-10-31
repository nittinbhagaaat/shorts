// models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    // Optional for users who sign in via Google OAuth
  },
  image: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  provider: {
    type: String,
    enum: ['credentials', 'google'],
    default: 'credentials',
  },
  googleId: {
    type: String,
    sparse: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'nitinbhagatxyz@gmail.com').toLowerCase().trim();

UserSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.email && this.email.toLowerCase().trim() === ADMIN_EMAIL) {
    this.role = 'admin';
  }
  if (typeof next === 'function') next();
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
