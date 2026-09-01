import mongoose from 'mongoose';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, uri: null };
}

/**
 * Connects to MongoDB using a dynamic URI (passed from client settings or fallback).
 */
export async function dbConnect(customUri) {
  const targetUri = customUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/shorts';

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
    };

    cached.promise = mongoose.connect(targetUri, opts).then((mongooseInstance) => {
      cached.uri = targetUri;
      return mongooseInstance;
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
