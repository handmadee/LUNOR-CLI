import mongoose, { Schema, Document } from 'mongoose';

/**
 * Scheduler Config Document Interface
 */
export interface ISchedulerConfig extends Document {
  isEnabled: boolean;
  morningClockIn: string;
  morningClockOut: string;
  afternoonClockIn: string;
  afternoonClockOut: string;
  updatedAt: Date;
}

/**
 * Scheduler Config Schema
 */
const SchedulerConfigSchema = new Schema<ISchedulerConfig>(
  {
    isEnabled: {
      type: Boolean,
      default: true,
    },
    morningClockIn: {
      type: String,
      default: '08:00',
      match: /^([01]\d|2[0-3]):([0-5]\d)$/, // HH:MM format
    },
    morningClockOut: {
      type: String,
      default: '12:00',
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    afternoonClockIn: {
      type: String,
      default: '13:30',
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    afternoonClockOut: {
      type: String,
      default: '17:30',
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    collection: 'schedulerConfig',
  }
);

/**
 * Static method to get or create singleton config
 */
SchedulerConfigSchema.statics.getSingleton = async function (): Promise<ISchedulerConfig> {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

/**
 * Scheduler Config Model
 */
export const SchedulerConfigModel = mongoose.model<ISchedulerConfig>('SchedulerConfig', SchedulerConfigSchema);
