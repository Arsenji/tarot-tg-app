import mongoose, { Document, Schema } from 'mongoose';

export interface ITarotReading extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'single' | 'three_cards' | 'yes_no';
  category?: 'love' | 'career' | 'personal';
  userQuestion?: string; // Вопрос пользователя
  clarifyingQuestions?: Array<{
    question: string;
    card: {
      name: string;
      meaning: string;
      advice: string;
      keywords: string;
      imagePath?: string;
    };
    interpretation: string;
    timestamp: Date;
  }>;
  cards: Array<{
    name: string;
    position?: 'past' | 'present' | 'future';
    meaning: string;
    advice: string;
    keywords: string;
    imagePath?: string; // Добавляем путь к изображению карты
    detailedDescription?: {
      general: string;
      love: string;
      career: string;
      personal: string;
      reversed?: string;
    };
  }>;
  interpretation: string;
  createdAt: Date;
}

const TarotReadingSchema = new Schema<ITarotReading>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['single', 'three_cards', 'yes_no'],
    required: true
  },
  category: {
    type: String,
    enum: ['love', 'career', 'personal'],
    default: null
  },
  userQuestion: {
    type: String,
    default: null
  },
  clarifyingQuestions: [{
    question: {
      type: String,
      required: true
    },
    card: {
      name: {
        type: String,
        required: true
      },
      meaning: {
        type: String,
        required: true
      },
      advice: {
        type: String,
        required: true
      },
      keywords: {
        type: String,
        required: true
      },
      imagePath: {
        type: String,
        default: null
      }
    },
    interpretation: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  cards: [{
    name: {
      type: String,
      required: true
    },
    position: {
      type: String,
      enum: ['past', 'present', 'future'],
      default: null
    },
    meaning: {
      type: String,
      required: true
    },
    advice: {
      type: String,
      required: true
    },
    keywords: {
      type: String,
      required: true
    },
    imagePath: {
      type: String,
      default: null
    },
    detailedDescription: {
      general: {
        type: String,
        default: null
      },
      love: {
        type: String,
        default: null
      },
      career: {
        type: String,
        default: null
      },
      personal: {
        type: String,
        default: null
      },
      reversed: {
        type: String,
        default: null
      }
    }
  }],
  interpretation: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Indexes
TarotReadingSchema.index({ userId: 1, createdAt: -1 });
TarotReadingSchema.index({ type: 1 });
TarotReadingSchema.index({ category: 1 });

export const TarotReading = mongoose.model<ITarotReading>('TarotReading', TarotReadingSchema);
