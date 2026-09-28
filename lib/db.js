import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, uri: null };
}

/**
 * Connects to MongoDB using a dynamic URI (passed from client settings or fallback).
 */
export async function dbConnect(customUri) {
  let targetUri = customUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shorts';

  // Normalize localhost to 127.0.0.1 to avoid macOS IPv6 (::1) ECONNREFUSED issues
  if (targetUri.includes('localhost:27017')) {
    targetUri = targetUri.replace('localhost:27017', '127.0.0.1:27017');
  }

  // If already connected with the same URI, return existing connection
  if (cached.conn && cached.uri === targetUri && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If URI changed or disconnected, reset cached connection
  if (cached.uri && cached.uri !== targetUri) {
    console.log(`[dbConnect] Switching MongoDB connection to: ${targetUri}`);
    await mongoose.disconnect().catch(() => {});
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(targetUri, opts).then((mongooseInstance) => {
      cached.uri = targetUri;
      return mongooseInstance;
    }).catch(async (err) => {
      // If 127.0.0.1 failed, try localhost fallback, or vice versa
      const fallbackUri = targetUri.includes('127.0.0.1')
        ? targetUri.replace('127.0.0.1', 'localhost')
        : targetUri.replace('localhost', '127.0.0.1');

      console.warn(`[dbConnect] Initial connection to ${targetUri} failed, attempting fallback to: ${fallbackUri}`);
      try {
        const fallbackInstance = await mongoose.connect(fallbackUri, opts);
        cached.uri = fallbackUri;
        return fallbackInstance;
      } catch (fallbackErr) {
        cached.promise = null;
        cached.conn = null;
        throw fallbackErr;
      }
    });
  }

  try {
    cached.conn = await cached.promise;
    cached.uri = targetUri;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
