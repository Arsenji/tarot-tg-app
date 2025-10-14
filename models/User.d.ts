import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    telegramId: number;
    firstName: string;
    lastName?: string;
    username?: string;
    languageCode?: string;
    isPremium: boolean;
    premiumExpiresAt?: Date;
    subscriptionStatus: 0 | 1;
    subscriptionExpiry?: Date;
    subscriptionActivatedAt?: Date;
    freeDailyAdviceUsed: boolean;
    freeYesNoUsed: boolean;
    freeThreeCardsUsed: boolean;
    lastDailyAdviceDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.d.ts.map