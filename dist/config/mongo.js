import mongoose from 'mongoose';
import { env } from './env.js';
export async function connectMongo() {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI);
}
export async function disconnectMongo() {
    await mongoose.disconnect();
}
export function getMongoStatus() {
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const state = mongoose.connection.readyState;
    if (state === 1)
        return 'ok';
    if (state === 2)
        return 'disconnected';
    return 'error';
}
//# sourceMappingURL=mongo.js.map