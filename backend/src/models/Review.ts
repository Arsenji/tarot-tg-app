import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  userId: string;
  telegramId: number;
  userName: string;
  userUsername: string;
  review: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  telegramId: {
    type: Number,
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  userUsername: {
    type: String,
    default: '',
    trim: true
  },
  review: {
    type: String,
    required: true,
    maxlength: 1000
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 0
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ telegramId: 1 });
ReviewSchema.index({ rating: 1 });
ReviewSchema.index({ createdAt: -1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
