import mongoose, { Schema, Document } from 'mongoose';

/**
 * Credentials Document Interface
 */
export interface ICredentials extends Document {
  userId: string;
  displayName?: string;
  teamId: string;
  accessToken: string;
  deviceId?: string;
  sessionId?: string;
  userObjectId?: string;
  tenantId?: string;
  cookies?: object;
  loginEmail?: string;
  loginPassword?: string;
  tokenExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Credentials Schema
 */
const CredentialsSchema = new Schema<ICredentials>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
    },
    teamId: {
      type: String,
      required: true,
      index: true,
    },
    accessToken: {
      type: String,
      required: true,
      select: true, // Include by default but can be excluded in queries
    },
    deviceId: {
      type: String,
    },
    sessionId: {
      type: String,
    },
    userObjectId: {
      type: String,
    },
    tenantId: {
      type: String,
      index: true,
    },
    cookies: {
      type: Schema.Types.Mixed,
    },
    loginEmail: {
      type: String,
    },
    loginPassword: {
      type: String,
      select: false, // Exclude by default for security
    },
    tokenExpiresAt: {
      type: Date,
      index: true, // For efficient token expiry queries
    },
  },
  {
    timestamps: true,
    collection: 'credentials',
  }
);

// Compound indexes for common queries
CredentialsSchema.index({ teamId: 1, userId: 1 });

/**
 * Credentials Model
 */
export const CredentialsModel = mongoose.model<ICredentials>('Credentials', CredentialsSchema);
