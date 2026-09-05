import { type Document, type Model } from 'mongoose';
export interface IUser {
    name: string;
    email: string;
    passwordHash: string;
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface IUserDocument extends IUser, Document {
    toPublic(): PublicUser;
}
export interface PublicUser {
    id: string;
    name: string;
    email: string;
    timezone: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const User: Model<IUserDocument>;
//# sourceMappingURL=user.model.d.ts.map