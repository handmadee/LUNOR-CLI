import mongoose, { Schema, Document } from 'mongoose';

export enum AttendanceType {
  CLOCK_IN = 'clock_in',
  CLOCK_OUT = 'clock_out',
}

export enum AttendanceShift {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
}

export enum AttendanceStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PENDING = 'pending',
}

/**
 * Attendance Log Document Interface
 */
export interface IAttendanceLog extends Document {
  type: AttendanceType;
  shift: AttendanceShift;
  timecardId?: string;
  status: AttendanceStatus;
  response?: object;
  errorMessage?: string;
  createdAt: Date;
}

/**
 * Attendance Log Schema
 */
const AttendanceLogSchema = new Schema<IAttendanceLog>(
  {
    type: {
      type: String,
      required: true,
      enum: Object.values(AttendanceType),
      index: true,
    },
    shift: {
      type: String,
      required: true,
      enum: Object.values(AttendanceShift),
      index: true,
    },
    timecardId: {
      type: String,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(AttendanceStatus),
      index: true,
    },
    response: {
      type: Schema.Types.Mixed,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'attendanceLogs',
  }
);

// Compound indexes for common queries
AttendanceLogSchema.index({ createdAt: -1 }); // For date-based queries
AttendanceLogSchema.index({ shift: 1, type: 1, createdAt: -1 });
AttendanceLogSchema.index({ status: 1, createdAt: -1 });

/**
 * Attendance Log Model
 */
export const AttendanceLogModel = mongoose.model<IAttendanceLog>('AttendanceLog', AttendanceLogSchema);
