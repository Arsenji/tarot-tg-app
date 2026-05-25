import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  telegramId: number;
  firstName: string;
  lastName: string;
  username: string;
  languageCode: string;
  /** @deprecated legacy subscription — not used in token model */
  subscriptionStatus: number;
  /** @deprecated legacy subscription — not used in token model */
  subscriptionExpiresAt?: Date;
  tokensBalance: number;
  /** Lifetime free Yes/No uses consumed (max 3) */
  freeYesNoUsed: number;
  /** Lifetime free Three Cards uses consumed (max 3) */
  freeThreeCardsUsed: number;
  lastDailyAdviceDate?: Date;
  /** @deprecated daily cooldown replaced by token model for yes/no */
  lastYesNoDate?: Date;
  /** @deprecated daily cooldown replaced by token model for three cards */
  lastThreeCardsDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  telegramId: {
    type: Number,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    default: '',
    trim: true,
  },
  username: {
    type: String,
    default: '',
    trim: true,
  },
  languageCode: {
    type: String,
    default: 'ru',
    trim: true,
  },
  subscriptionStatus: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  subscriptionExpiresAt: {
    type: Date,
    default: null,
  },
  tokensBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
  freeYesNoUsed: {
    type: Number,
    default: 0,
    min: 0,
  },
  freeThreeCardsUsed: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastDailyAdviceDate: {
    type: Date,
    default: null,
  },
  lastYesNoDate: {
    type: Date,
    default: null,
  },
  lastThreeCardsDate: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

UserSchema.index({ subscriptionStatus: 1 });
UserSchema.index({ subscriptionExpiresAt: 1 });
UserSchema.index({ tokensBalance: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
