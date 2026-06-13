import mongoose, { Schema, Document } from 'mongoose';

/**
 * Leantime Credentials Document Interface
 */
export interface ILeantimeCredentials extends Document {
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  sessionCookie?: string;
  leantimeUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Leantime Credentials Schema
 */
const LeantimeCredentialsSchema = new Schema<ILeantimeCredentials>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    accessToken: {
      type: String,
    },
    refreshToken: {
      type: String,
      select: false, // Exclude by default for security
    },
    sessionCookie: {
      type: String,
    },
    leantimeUrl: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'leantimeCredentials',
  }
);

/**
 * Leantime Credentials Model
 */
export const LeantimeCredentialsModel = mongoose.model<ILeantimeCredentials>(
  'LeantimeCredentials',
  LeantimeCredentialsSchema
);
