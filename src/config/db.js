import mongoose from 'mongoose';
import { env } from './env.js';

// Cache the connection promise so serverless invocations (e.g. Vercel) reuse
// one connection per warm instance instead of reconnecting on every request.
let connecting = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (!connecting) {
    mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
    connecting = mongoose
      .connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 })
      .then(() => {
        console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
      })
      .catch((err) => {
        connecting = null; // allow a retry on the next request
        throw err;
      });
  }
  await connecting;
}

export async function disconnectDB() {
  await mongoose.connection.close();
  connecting = null;
}
