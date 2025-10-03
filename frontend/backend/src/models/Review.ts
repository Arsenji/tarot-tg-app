import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  userId: string;
  telegramId: number;
  userName: string;
  userUsername?: string;
  review: string;
  rating?: number; // Оценка от 1 до 5, если будет реализовано
  status: 'new' | 'published' | 'hidden';
  adminResponse?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema({
  userId: { type: String, required: true },
  telegramId: { type: Number, required: true },
  userName: { type: String, required: true },
  userUsername: { type: String },
  review: { type: String, required: true },
  rating: { type: Number, min: 0, max: 5 },
  status: { type: String, enum: ['new', 'published', 'hidden'], default: 'new' },
  adminResponse: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ReviewSchema.index({ telegramId: 1 });
ReviewSchema.index({ status: 1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
