import mongoose, { Schema, Document } from 'mongoose';

/**
 * Error Log Document Interface
 */
export interface IErrorLog extends Document {
  errorCode: string;
  errorMessage: string;
  stackTrace?: string;
  context?: object;
  createdAt: Date;
}

/**
 * Error Log Schema
 */
const ErrorLogSchema = new Schema<IErrorLog>(
  {
    errorCode: {
      type: String,
      required: true,
      index: true,
    },
    errorMessage: {
      type: String,
      required: true,
    },
    stackTrace: {
      type: String,
    },
    context: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'errorLogs',
  }
);

// TTL index - auto-delete logs after 30 days
ErrorLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Compound index for queries
ErrorLogSchema.index({ errorCode: 1, createdAt: -1 });

/**
 * Error Log Model
 */
export const ErrorLogModel = mongoose.model<IErrorLog>('ErrorLog', ErrorLogSchema);
