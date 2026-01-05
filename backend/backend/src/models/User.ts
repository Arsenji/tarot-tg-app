import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  telegramId: number;
  firstName: string;
  lastName: string;
  username: string;
  languageCode: string;
  subscriptionStatus: number; // 0 - нет подписки, 1 - есть подписка
  subscriptionExpiresAt?: Date;
  freeYesNoUsed: boolean; // Deprecated - используем lastYesNoDate
  lastDailyAdviceDate?: Date; // Дата последнего использования Daily Advice
  lastYesNoDate?: Date; // Дата последнего использования Yes/No
  lastThreeCardsDate?: Date; // Дата последнего использования Three Cards
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  telegramId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    default: '',
    trim: true
  },
  username: {
    type: String,
    default: '',
    trim: true
  },
  languageCode: {
    type: String,
    default: 'ru',
    trim: true
  },
  subscriptionStatus: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  subscriptionExpiresAt: {
    type: Date,
    default: null
  },
  freeYesNoUsed: {
    type: Boolean,
    default: false
  },
  lastDailyAdviceDate: {
    type: Date,
    default: null
  },
  lastYesNoDate: {
    type: Date,
    default: null
  },
  lastThreeCardsDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
// telegramId уже имеет индекс через unique: true и index: true
UserSchema.index({ subscriptionStatus: 1 });
UserSchema.index({ subscriptionExpiresAt: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
