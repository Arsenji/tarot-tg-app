import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium: boolean;
  premiumExpiresAt?: Date;
  subscriptionStatus: 0 | 1; // 0 - нет подписки, 1 - есть подписка
  subscriptionExpiry?: Date; // дата окончания подписки
  subscriptionActivatedAt?: Date; // дата активации подписки
  // Счетчики бесплатных раскладов
  freeDailyAdviceUsed: boolean; // использован ли бесплатный расклад "Совет дня"
  freeYesNoUsed: boolean; // использован ли бесплатный расклад Да/Нет
  freeThreeCardsUsed: boolean; // использован ли бесплатный расклад "3 карты"
  lastDailyAdviceDate?: Date; // дата последнего использования "Совет дня"
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
    required: true
  },
  lastName: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    default: ''
  },
  languageCode: {
    type: String,
    default: 'ru'
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumExpiresAt: {
    type: Date,
    default: null
  },
  subscriptionStatus: {
    type: Number,
    enum: [0, 1],
    default: 0
  },
  subscriptionExpiry: {
    type: Date,
    default: null
  },
  subscriptionActivatedAt: {
    type: Date,
    default: null
  },
  freeDailyAdviceUsed: {
    type: Boolean,
    default: false
  },
  freeYesNoUsed: {
    type: Boolean,
    default: false
  },
  freeThreeCardsUsed: {
    type: Boolean,
    default: false
  },
  lastDailyAdviceDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes (telegramId уже имеет index: true в схеме)
UserSchema.index({ isPremium: 1 });
UserSchema.index({ subscriptionStatus: 1 });
UserSchema.index({ subscriptionExpiry: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
