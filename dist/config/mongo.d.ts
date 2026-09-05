export type MongoStatus = 'ok' | 'error' | 'disconnected';
export declare function connectMongo(): Promise<void>;
export declare function disconnectMongo(): Promise<void>;
export declare function getMongoStatus(): MongoStatus;
//# sourceMappingURL=mongo.d.ts.map