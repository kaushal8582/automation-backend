import mongoose from 'mongoose';
import { env } from './env.js';

export type MongoStatus = 'ok' | 'error' | 'disconnected';

export async function connectMongo(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

export function getMongoStatus(): MongoStatus {
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const state = mongoose.connection.readyState;
  if (state === 1) return 'ok';
  if (state === 2) return 'disconnected';
  return 'error';
}
