import mongoose, { type Document, type Model, Schema } from 'mongoose';

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

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    passwordHash: { type: String, required: true, select: false },
    timezone: { type: String, required: true, default: 'UTC', maxlength: 64 },
  },
  { timestamps: true },
);

userSchema.methods.toPublic = function toPublic(this: IUserDocument): PublicUser {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    timezone: this.timezone,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const User: Model<IUserDocument> =
  mongoose.models.User ?? mongoose.model<IUserDocument>('User', userSchema);
