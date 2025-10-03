import mongoose, { Document, Schema } from 'mongoose';

export interface ISupportMessage extends Document {
  userId: string;
  telegramId: number;
  userName: string;
  userUsername?: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved';
  adminResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupportMessageSchema: Schema = new Schema({
  userId: { type: String, required: true },
  telegramId: { type: Number, required: true },
  userName: { type: String, required: true },
  userUsername: { type: String },
  message: { type: String, required: true },
  status: { type: String, enum: ['new', 'in_progress', 'resolved'], default: 'new' },
  adminResponse: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SupportMessageSchema.index({ telegramId: 1 });
SupportMessageSchema.index({ status: 1 });

export const SupportMessage = mongoose.model<ISupportMessage>('SupportMessage', SupportMessageSchema);
