import mongoose from 'mongoose';

const DEFAULT_URI = 'mongodb://localhost:27017/shorts';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, uri: null };
}

export async function dbConnect(customUri) {
  const uri = (customUri || process.env.MONGODB_URI || DEFAULT_URI).trim();

  // If already connected with the same URI, reuse connection
  if (cached.conn && cached.uri === uri && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If connection is in progress with the same URI, wait for it
  if (cached.promise && cached.uri === uri) {
    cached.conn = await cached.promise;
    return cached.conn;
  }

  // If URI changed or disconnected, disconnect first
  if (mongoose.connection.readyState !== 0 && cached.uri !== uri) {
    try {
      await mongoose.disconnect();
    } catch (e) {
      console.warn('Mongoose disconnect warning:', e.message);
    }
  }

  const opts = {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
  };

  cached.uri = uri;
  cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
    return mongooseInstance;
  });

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
