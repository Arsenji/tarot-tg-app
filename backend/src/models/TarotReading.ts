import mongoose, { Document, Schema } from 'mongoose';

export interface ITarotReading extends Document {
  userId: string;
  telegramId: number;
  readingType: 'single' | 'three' | 'yesno';
  cards: Array<{
    name: string;
    position: string;
    isReversed: boolean;
    interpretation: string;
  }>;
  question?: string;
  interpretation: string;
  createdAt: Date;
  updatedAt: Date;
}

const TarotReadingSchema = new Schema<ITarotReading>({
  userId: {
    type: String,
    required: true
  },
  telegramId: {
    type: Number,
    required: true
  },
  readingType: {
    type: String,
    required: true,
    enum: ['single', 'three', 'yesno']
  },
  cards: [{
    name: {
      type: String,
      required: true
    },
    position: {
      type: String,
      required: true
    },
    isReversed: {
      type: Boolean,
      default: false
    },
    interpretation: {
      type: String,
      required: true
    }
  }],
  question: {
    type: String,
    default: '',
    maxlength: 1000
  },
  interpretation: {
    type: String,
    required: true,
    maxlength: 5000
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
TarotReadingSchema.index({ userId: 1 });
TarotReadingSchema.index({ telegramId: 1 });
TarotReadingSchema.index({ readingType: 1 });
TarotReadingSchema.index({ createdAt: -1 });

export const TarotReading = mongoose.model<ITarotReading>('TarotReading', TarotReadingSchema);
