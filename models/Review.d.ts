import mongoose, { Document } from 'mongoose';
export interface IReview extends Document {
    userId: string;
    telegramId: number;
    userName: string;
    userUsername?: string;
    review: string;
    rating?: number;
    status: 'new' | 'published' | 'hidden';
    adminResponse?: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Review: mongoose.Model<IReview, {}, {}, {}, mongoose.Document<unknown, {}, IReview, {}, {}> & IReview & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Review.d.ts.map